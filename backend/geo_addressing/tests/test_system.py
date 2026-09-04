import pytest
import math
import geopandas as gpd
from shapely.geometry import Polygon, Point
from geo_addressing.config import FEISTEL_KEY, VOCAB_SIZE
from geo_addressing.core import (
    AddressingSystem,
    feistel_encrypt,
    feistel_decrypt,
    compute_checksum,
    validate_checksum,
    parse_address_parts
)

@pytest.fixture
def mock_addressing_system():
    # Create mock adjacent boundaries for two states: MH and KA in WGS84
    # MH: Latitude 18.0 to 20.0, Longitude 72.0 to 75.0
    # KA: Latitude 15.0 to 18.0, Longitude 72.0 to 75.0
    mh_poly = Polygon([(72.0, 18.0), (75.0, 18.0), (75.0, 20.0), (72.0, 20.0)])
    ka_poly = Polygon([(72.0, 15.0), (75.0, 15.0), (75.0, 18.0), (72.0, 18.0)])
    
    gdf = gpd.GeoDataFrame({
        'state_code': ['MH', 'KA'],
        'geometry': [mh_poly, ka_poly]
    }, crs="EPSG:4326")
    
    # Generate exactly VOCAB_SIZE mock words
    words = [f"word{i}" for i in range(VOCAB_SIZE)]
    
    return AddressingSystem(boundary_source=gdf, wordlist_source=words)

def test_feistel_round_trip(mock_addressing_system):
    # Test for every state: sample 10,000 random n in [0, D), encrypt then decrypt, assert output == input
    system = mock_addressing_system
    
    for state_code, cache in system.grid_cache.items():
        D = cache['total_cells']
        # Sample up to 10,000 values (or D if D is smaller than 10000)
        step = max(1, D // 10000)
        samples = list(range(0, D, step))[:10000]
        
        for n in samples:
            encrypted = feistel_encrypt(n, D, system.feistel_key)
            decrypted = feistel_decrypt(encrypted, D, system.feistel_key)
            assert decrypted == n, f"Feistel failed for state {state_code}, n={n}, encrypted={encrypted}, decrypted={decrypted}"

def test_cycle_walking_termination(mock_addressing_system):
    # Runs cycle-walking over the largest and smallest state's D values and confirms termination
    system = mock_addressing_system
    
    # In our mock system, the states' D values are:
    for state_code, cache in system.grid_cache.items():
        D = cache['total_cells']
        
        # Test boundary values
        for val in [0, D - 1]:
            # Directly call to verify termination and no runtime error
            enc = feistel_encrypt(val, D, system.feistel_key)
            dec = feistel_decrypt(enc, D, system.feistel_key)
            assert dec == val

def test_checksum_validation(mock_addressing_system):
    system = mock_addressing_system
    
    # Test a manually constructed checksum
    w1_idx = 100
    digit1 = 5
    w2_idx = 45000
    digit2 = 1
    state_code = "MH"
    
    checksum = compute_checksum(w1_idx, digit1, w2_idx, digit2, state_code)
    
    # Address format: statecode/word1digit1/word2digit2checksum
    address = f"{state_code.upper()}/{system.index_to_word[w1_idx].lower()}{digit1}/{system.index_to_word[w2_idx].lower()}{digit2}{checksum.lower()}"
    
    # Valid address
    assert validate_checksum(address, system.word_to_index) is True
    
    # Invalid checksum due to mutation
    mutated_address = address[:-1] + ("a" if address[-1] != "a" else "b")
    assert validate_checksum(mutated_address, system.word_to_index) is False
    
    # Invalid format
    assert validate_checksum("mh/word1005/word45000", system.word_to_index) is False

def test_parse_address_parts_malformed():
    # Should reject missing digit/tail
    with pytest.raises(ValueError, match="digit2 must be a digit"):
        parse_address_parts("mh/word5/word")
    
    # Should reject non-digit in digit1 position
    with pytest.raises(ValueError, match="digit1 must be a digit"):
        parse_address_parts("mh/wordx/word5c")
        
    # Should reject non-digit in digit2 position
    with pytest.raises(ValueError, match="digit2 must be a digit"):
        parse_address_parts("mh/word5/wordxc")
        
    # Valid case but case-insensitive
    st, w1, d1, w2, d2, chk = parse_address_parts("mH/WoRd5/wOrD4X")
    assert st == "MH"
    assert w1 == "word"
    assert d1 == 5
    assert w2 == "word"
    assert d2 == 4
    assert chk == "X"

def test_coordinate_round_trip(mock_addressing_system):
    system = mock_addressing_system
    
    # Test at least 3 points per state (MH and KA)
    points_to_test = {
        'MH': [
            (19.0, 73.5),
            (18.5, 74.0),
            (19.8, 72.5)
        ],
        'KA': [
            (16.0, 73.5),
            (17.5, 74.0),
            (15.2, 72.5)
        ]
    }
    
    for state, points in points_to_test.items():
        for lat, lon in points:
            # Lat/Lon -> Address
            addr = system.encode_address(lat, lon, state)
            
            # Address -> Lat/Lon
            dec_lat, dec_lon, dec_state = system.decode_address(addr)
            
            assert dec_state == state
            
            # Check distance between original point and center of the cell is within 3 meters
            # To do this accurately, we project both to meters and measure Euclidean distance
            orig_x, orig_y = system.project_to_meters(lat, lon)
            dec_x, dec_y = system.project_to_meters(dec_lat, dec_lon)
            
            dist = math.sqrt((orig_x - dec_x)**2 + (orig_y - dec_y)**2)
            # Since precision target is 3m x 3m grid cell, maximum distance from cell center to any point in the cell is:
            # sqrt(1.5^2 + 1.5^2) = sqrt(4.5) ≈ 2.12 meters.
            # Thus, distance must be strictly less than 3 meters.
            assert dist <= 3.0, f"Distance {dist} exceeds 3m target for point {lat},{lon}"

def test_boundary_tolerance_and_determinism(mock_addressing_system):
    system = mock_addressing_system
    
    # Bottom-left and bottom-right of MH in WGS84 are (18.0, 72.0) and (18.0, 75.0)
    # The projected segment represents the border.
    p_bl = system.project_to_meters(18.0, 72.0)
    p_br = system.project_to_meters(18.0, 75.0)
    
    # Midpoint of the straight segment in projected space
    x_mid = (p_bl[0] + p_br[0]) / 2.0
    y_mid = (p_bl[1] + p_br[1]) / 2.0
    
    # 2m North of the boundary -> inside MH
    lat_in, lon_in = system.project_to_wgs84(x_mid, y_mid + 2.0)
    n, state = system.latlon_to_cell(lat_in, lon_in, 'MH')
    assert state == 'MH'
    
    # 2m South of the boundary -> inside KA
    lat_out, lon_out = system.project_to_wgs84(x_mid, y_mid - 2.0)
    
    # Pass 'MH' but coordinate is in 'KA'. Fallback tolerance of 5m should resolve it to 'KA'.
    n, resolved_state = system.latlon_to_cell(lat_out, lon_out, 'MH')
    assert resolved_state == 'KA'
    
    # A point exactly on the boundary line
    lat_border, lon_border = system.project_to_wgs84(x_mid, y_mid)
    n1, state1 = system.latlon_to_cell(lat_border, lon_border, 'MH')
    n2, state2 = system.latlon_to_cell(lat_border, lon_border, 'MH')
    
    # Assert determinism (doesn't flip-flop)
    assert state1 == state2
    assert n1 == n2

def test_digit2_max_validation():
    # If a state's grid is too large that digit2_max > 9, it must raise a ValueError during init
    # Let's mock an extremely large state.
    # D must exceed: VOCAB_SIZE * 10 * VOCAB_SIZE * 9 = 53512 * 10 * 53512 * 9 ≈ 2.57e11 cells.
    # At 3m x 3m, 2.57e11 cells is 2.3e12 m2 (2.3 million km2), which is huge.
    # Let's mock a state with extremely large bounding box so that digit2_max > 9.
    # Width of 3,000,000 meters and height of 3,000,000 meters.
    # Total cells = (3,000,000 / 3) * (3,000,000 / 3) = 1e6 * 1e6 = 1e12 cells.
    # digit2_max = ceil(1e12 / 2.86e10) = 35 > 9.
    
    # In WGS84, let's create a huge polygon or pass custom gdf to test it
    huge_poly = Polygon([(0.0, 0.0), (30.0, 0.0), (30.0, 30.0), (0.0, 30.0)])
    gdf = gpd.GeoDataFrame({
        'state_code': ['HUGE'],
        'geometry': [huge_poly]
    }, crs="EPSG:4326")
    
    words = [f"word{i}" for i in range(VOCAB_SIZE)]
    
    with pytest.raises(ValueError, match="exceeds 9"):
        AddressingSystem(boundary_source=gdf, wordlist_source=words)

def test_vocab_size_mismatch():
    # Construct AddressingSystem with a word list of wrong length (VOCAB_SIZE - 1)
    mh_poly = Polygon([(72.0, 18.0), (75.0, 18.0), (75.0, 20.0), (72.0, 20.0)])
    gdf = gpd.GeoDataFrame({
        'state_code': ['MH'],
        'geometry': [mh_poly]
    }, crs="EPSG:4326")
    
    invalid_words = [f"word{i}" for i in range(VOCAB_SIZE - 1)]
    
    with pytest.raises(ValueError, match="Word list length mismatch"):
        AddressingSystem(boundary_source=gdf, wordlist_source=invalid_words)

def test_clamping_warning(mock_addressing_system, caplog):
    import logging
    system = mock_addressing_system
    
    # Get the bottom-left corner of MH in projected space
    p_bl = system.project_to_meters(18.0, 72.0)
    
    # Position a point 1 meter West of the bottom-left corner of MH, but 1 meter North of it
    x_outside = p_bl[0] - 1.0
    y_outside = p_bl[1] + 1.0
    
    # Convert back to WGS84
    lat_out, lon_out = system.project_to_wgs84(x_outside, y_outside)
    
    # Set logging level to WARNING to capture the warning
    with caplog.at_level(logging.WARNING):
        # Resolve point passing 'MH'
        n, resolved_state = system.latlon_to_cell(lat_out, lon_out, 'MH')
        
    assert resolved_state == 'MH'
    
    # Check that clamping warning was logged
    warnings = [rec for rec in caplog.records if rec.levelname == "WARNING"]
    assert len(warnings) > 0
    assert "Clamped grid position for state MH" in warnings[0].message
    assert "col -1 -> 0" in warnings[0].message or "row -1 -> 0" in warnings[0].message

