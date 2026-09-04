import os
import pytest
import math
from geo_addressing.config import VOCAB_SIZE
from geo_addressing.core import AddressingSystem

@pytest.fixture(scope="module")
def real_addressing_system():
    # Load the real geojson file downloaded by fetch_boundaries.py
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    geojson_path = os.path.join(data_dir, "geoBoundaries-IND-ADM1.geojson")
    
    assert os.path.exists(geojson_path), f"Boundary file not found at {geojson_path}. Run fetch_boundaries.py first."
    
    # Generate exactly VOCAB_SIZE mock words
    words = [f"word{i}" for i in range(VOCAB_SIZE)]
    
    return AddressingSystem(boundary_source=geojson_path, wordlist_source=words)

def test_real_boundaries_round_trip(real_addressing_system):
    system = real_addressing_system
    
    # Landmark coordinates in India:
    # 1. Gateway of India, Mumbai, Maharashtra (MH)
    # 2. Victoria Memorial, Kolkata, West Bengal (WB)
    # 3. Hawa Mahal, Jaipur, Rajasthan (RJ)
    landmarks = [
        (18.9220, 72.8347, "MH"),
        (22.5448, 88.3426, "WB"),
        (26.9239, 75.8267, "RJ")
    ]
    
    for lat, lon, state in landmarks:
        # Lat/Lon -> Address
        addr = system.encode_address(lat, lon, state)
        
        # Address -> Lat/Lon
        dec_lat, dec_lon, dec_state = system.decode_address(addr)
        
        assert dec_state == state
        
        # Check that decoding is within 3 meters
        orig_x, orig_y = system.project_to_meters(lat, lon)
        dec_x, dec_y = system.project_to_meters(dec_lat, dec_lon)
        
        dist = math.sqrt((orig_x - dec_x)**2 + (orig_y - dec_y)**2)
        assert dist <= 3.0, f"Distance {dist} meters exceeds 3m for landmark in {state}"

def test_unmapped_state_name_error():
    # If the GeoDataFrame contains an unknown shapeName, it must raise a ValueError during init
    import geopandas as gpd
    from shapely.geometry import Polygon
    
    dummy_poly = Polygon([(72.0, 18.0), (75.0, 18.0), (75.0, 20.0), (72.0, 20.0)])
    gdf = gpd.GeoDataFrame({
        'shapeName': ['UnknownStateName'],
        'geometry': [dummy_poly]
    }, crs="EPSG:4326")
    
    words = [f"word{i}" for i in range(VOCAB_SIZE)]
    
    with pytest.raises(ValueError, match="Found unmapped state names"):
        AddressingSystem(boundary_source=gdf, wordlist_source=words)

def test_all_states_load_and_validate_digit2_max(real_addressing_system):
    """Confirms all 28 states + 8 UTs loaded and passed digit2_max validation at init."""
    assert len(real_addressing_system.grid_cache) == 36, (
        f"Expected 36 states/UTs, got {len(real_addressing_system.grid_cache)}: "
        f"{sorted(real_addressing_system.grid_cache.keys())}"
    )
    for code, cache in real_addressing_system.grid_cache.items():
        assert cache['digit2_max'] <= 9, f"State {code} exceeds digit2_max limit"

def test_dnh_dd_exclave_roundtrip(real_addressing_system):
    """One real point in each of the three non-contiguous exclave pieces must
    resolve to the same state_code and round-trip correctly."""
    system = real_addressing_system

    # Silvassa, Dadra & Nagar Haveli
    dnh_point = (20.2738, 73.0140)
    # Daman (mainland piece)
    daman_point = (20.3974, 72.8328)
    # Diu (separate island piece)
    diu_point = (20.7144, 70.9874)

    exclave_points = {
        "Silvassa (DNH)": dnh_point,
        "Daman": daman_point,
        "Diu": diu_point,
    }

    resolved_codes = set()
    for label, (lat, lon) in exclave_points.items():
        # Try encoding — state_code arg is a hint, actual resolution may differ
        # if the point falls near a boundary; that's fine, just confirm consistency.
        addr = system.encode_address(lat, lon, state_code="DN")
        dec_lat, dec_lon, dec_state = system.decode_address(addr)
        resolved_codes.add(dec_state)

        # Round-trip precision check
        orig_x, orig_y = system.project_to_meters(lat, lon)
        dec_x, dec_y = system.project_to_meters(dec_lat, dec_lon)
        dist = math.sqrt((orig_x - dec_x)**2 + (orig_y - dec_y)**2)
        assert dist <= 3.0, f"{label}: round-trip distance {dist}m exceeds 3m target"

    assert len(resolved_codes) == 1, (
        f"Exclave points resolved to different state codes: {resolved_codes} — "
        f"expected all three to unify under one UT code."
    )
