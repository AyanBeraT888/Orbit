import os
import math
import hmac
import hashlib
import logging
import geopandas as gpd
from shapely.geometry import Point, MultiPolygon
from pyproj import Transformer, CRS
from geo_addressing.config import FEISTEL_KEY, CRS_PROJECTION, GRID_CELL_SIZE, VOCAB_SIZE
from geo_addressing.state_codes import STATE_NAME_TO_CODE

logger = logging.getLogger(__name__)

# Character set for checksum encoding
CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def compute_checksum(word1_index: int, digit1: int, word2_index: int, digit2: int, state_code: str) -> str:
    """Computes a single checksum character using a mod-97 scheme."""
    # Convert state code characters to their 1-based alphabetic values (A=1, B=2, etc.)
    state_digits = "".join(str(ord(c) - ord('A') + 1) for c in state_code.upper())
    
    # Format components into a fixed-width numerical string
    val_str = f"{state_digits}{word1_index:05d}{digit1}{word2_index:05d}{digit2}"
    
    # Perform modulo 97 to get remainder
    rem = int(val_str) % 97
    
    # Map remainder to character set
    return CHARSET[rem % len(CHARSET)]

def parse_address_parts(address: str):
    """Parses address string into component parts."""
    parts = address.strip().split('/')
    if len(parts) != 3:
        raise ValueError("Invalid address format: must have 3 parts separated by '/'")
    
    state_code = parts[0].upper()
    
    p2 = parts[1]
    if len(p2) < 2:
        raise ValueError("Invalid format in second part: must contain word and digit")
    word1 = p2[:-1].lower()
    digit1_str = p2[-1]
    if not digit1_str.isdigit():
        raise ValueError("digit1 must be a digit")
    digit1 = int(digit1_str)
    
    p3 = parts[2]
    if len(p3) < 2:
        raise ValueError("Invalid format in third part: must contain word and digit2")
    
    checksum_char = None
    digit2_str = p3[-1]
    word2 = p3[:-1].lower()
    
    if not digit2_str.isdigit():
        raise ValueError("digit2 must be a digit")
    digit2 = int(digit2_str)
    
    return state_code, word1, digit1, word2, digit2, checksum_char

def validate_checksum(address: str, word_to_index: dict) -> bool:
    """Validates the checksum of an address using the provided word list index mapping."""
    # Checksums are disabled per user request, always return True if the format is valid
    try:
        state_code, word1, digit1, word2, digit2, _ = parse_address_parts(address)
        if word1 not in word_to_index or word2 not in word_to_index:
            return False
        return True
    except Exception:
        return False

# Feistel round function
def feistel_round_f(R: int, round_idx: int, max_val: int, key: bytes) -> int:
    msg = f"{round_idx}:{R}".encode('utf-8')
    h = hmac.new(key, msg, hashlib.sha256).digest()
    return int.from_bytes(h[:8], 'big') % max_val

def feistel_encrypt_block(n: int, L_max: int, half_bits: int, key: bytes) -> int:
    L = n >> half_bits
    R = n & (L_max - 1)
    for round_idx in range(4):
        next_L = R
        next_R = L ^ feistel_round_f(R, round_idx, L_max, key)
        L, R = next_L, next_R
    return (L << half_bits) | R

def feistel_decrypt_block(m: int, L_max: int, half_bits: int, key: bytes) -> int:
    L = m >> half_bits
    R = m & (L_max - 1)
    for round_idx in range(3, -1, -1):
        next_L = R ^ feistel_round_f(L, round_idx, L_max, key)
        next_R = L
        L, R = next_L, next_R
    return (L << half_bits) | R

def feistel_encrypt(n: int, D: int, key: bytes) -> int:
    if D <= 1:
        return 0
    k = 2
    while (1 << k) < D:
        k += 2
    half_bits = k // 2
    L_max = 1 << half_bits
    
    val = n
    iterations = 0
    while True:
        val = feistel_encrypt_block(val, L_max, half_bits, key)
        iterations += 1
        if val < D:
            return val
        if iterations > 1000:
            raise RuntimeError("Feistel cycle walking encryption failed to terminate")

def feistel_decrypt(m: int, D: int, key: bytes) -> int:
    if D <= 1:
        return 0
    k = 2
    while (1 << k) < D:
        k += 2
    half_bits = k // 2
    L_max = 1 << half_bits
    
    val = m
    iterations = 0
    while True:
        val = feistel_decrypt_block(val, L_max, half_bits, key)
        iterations += 1
        if val < D:
            return val
        if iterations > 1000:
            raise RuntimeError("Feistel cycle walking decryption failed to terminate")

class AddressingSystem:
    def __init__(self, boundary_source, wordlist_source, feistel_key=FEISTEL_KEY):
        self.feistel_key = feistel_key
        
        # Load and project boundaries
        # For attribution, see ATTRIBUTION.md in the project root.
        if isinstance(boundary_source, gpd.GeoDataFrame):
            self.gdf = boundary_source.copy()
        else:
            self.gdf = gpd.read_file(boundary_source)
            
        # NOTE: geoBoundaries depicts J&K/Ladakh per its own standardization, which may
        # not match India's official boundary position. If this matters for the product,
        # consider sourcing J&K/Ladakh specifically from Survey of India / Bhuvan instead
        # and merging it in before running the rest of the pipeline. Flagged for manual
        # review, not auto-resolved here.
            
        # Standardize CRS to EPSG:7755
        self.gdf = self.gdf.to_crs(CRS_PROJECTION)
        
        # If shapeName is present (from geoBoundaries), map to state_code
        if 'shapeName' in self.gdf.columns:
            unmapped = [name for name in self.gdf['shapeName'].unique() if name not in STATE_NAME_TO_CODE]
            if unmapped:
                raise ValueError(f"Found unmapped state names in boundary data: {unmapped}")
            self.gdf['state_code'] = self.gdf['shapeName'].map(STATE_NAME_TO_CODE)
        
        # Ensure state code/ID mapping
        # Assume gdf has a column 'state_code' or 'ST_CODE' or 'state'
        # We standardise the column name to 'state_code'
        if 'state_code' not in self.gdf.columns:
            possible_cols = ['ST_CODE', 'state', 'state_id', 'code', 'NAME_1']
            found = False
            for col in possible_cols:
                if col in self.gdf.columns:
                    self.gdf['state_code'] = self.gdf[col].astype(str).str.upper()
                    found = True
                    break
            if not found:
                raise ValueError("GeoDataFrame must contain 'state_code' or 'shapeName' or a recognizable state identifier column")
        else:
            self.gdf['state_code'] = self.gdf['state_code'].astype(str).str.upper()
            
        # Load word list
        if isinstance(wordlist_source, list):
            self.word_list = wordlist_source
        else:
            with open(wordlist_source, 'r', encoding='utf-8') as f:
                raw_lines = [line.strip() for line in f if line.strip()]
            
            # Check if it's a CSV with header/rank column
            if raw_lines and ',' in raw_lines[0]:
                parsed_words = []
                # Check if first line contains header titles
                has_header = any(keyword in raw_lines[0].lower() for keyword in ['word', 'rank', 'header'])
                start_idx = 1 if has_header else 0
                for line in raw_lines[start_idx:]:
                    parts = line.split(',', 1)
                    word = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                    if word:  # Skip empty values
                        parsed_words.append(word)
                self.word_list = parsed_words
            else:
                self.word_list = raw_lines
        
        if len(self.word_list) != VOCAB_SIZE:
            raise ValueError(
                f"Word list length mismatch: loaded {len(self.word_list)} words, "
                f"expected VOCAB_SIZE={VOCAB_SIZE}. Refusing to proceed — this would "
                f"silently break the digit2_max <= 9 guarantee."
            )
            
        self.index_to_word = {i: w for i, w in enumerate(self.word_list)}
        self.word_to_index = {w: i for i, w in enumerate(self.word_list)}
        
        # Setup projection transformers
        self.wgs84_to_meters = Transformer.from_crs(CRS("EPSG:4326"), CRS(CRS_PROJECTION), always_xy=True)
        self.meters_to_wgs84 = Transformer.from_crs(CRS(CRS_PROJECTION), CRS("EPSG:4326"), always_xy=True)
        
        # Build grid cache per state
        self.state_polygons = {}
        self.grid_cache = {}
        
        # Group non-contiguous states/UTs by state_code (e.g. Dadra & Nagar Haveli and Daman & Diu)
        grouped = self.gdf.groupby('state_code')
        for code, group in grouped:
            # Union all polygons for the same state code to handle MultiPolygon boundaries
            if hasattr(group.geometry, 'union_all'):
                combined_geom = group.geometry.union_all()
            else:
                combined_geom = group.geometry.unary_union
            self.state_polygons[code] = combined_geom
            
            # Compute bounds
            min_x, min_y, max_x, max_y = combined_geom.bounds
            num_cols = math.ceil((max_x - min_x) / GRID_CELL_SIZE)
            num_rows = math.ceil((max_y - min_y) / GRID_CELL_SIZE)
            total_cells = num_rows * num_cols
            
            V = len(self.word_list)
            digit2_max = math.ceil(total_cells / (V * 10 * V))
            
            logger.info(f"State {code}: digit2_max = {digit2_max}, cells = {total_cells}")
            if digit2_max > 9:
                raise ValueError(f"State {code} has digit2_max = {digit2_max} which exceeds 9. Silent truncation prevented.")
            
            self.grid_cache[code] = {
                'min_x': min_x,
                'min_y': min_y,
                'max_x': max_x,
                'max_y': max_y,
                'num_cols': num_cols,
                'num_rows': num_rows,
                'total_cells': total_cells,
                'digit2_max': digit2_max
            }

    def project_to_meters(self, lat: float, lon: float):
        return self.wgs84_to_meters.transform(lon, lat)

    def project_to_wgs84(self, x: float, y: float):
        lon, lat = self.meters_to_wgs84.transform(x, y)
        return lat, lon

    def find_nearest_state_polygon(self, point: Point, max_dist: float = 5.0):
        # Buffered search using distance against neighboring polygons only
        best_code = None
        min_distance = float('inf')
        
        # Create a tiny buffer for candidate search
        buf = point.buffer(max_dist)
        for code, poly in self.state_polygons.items():
            if poly.intersects(buf):
                dist = poly.distance(point)
                if dist < min_distance and dist <= max_dist:
                    min_distance = dist
                    best_code = code
        return best_code, min_distance

    def get_state_from_coords(self, lat: float, lon: float) -> str:
        """Finds the state code (e.g. MH, DL) containing the given lat/lon.
        If the point is not strictly inside any state boundary, it searches for
        the nearest state boundary within a 10km tolerance.
        Raises ValueError if not found.
        """
        x, y = self.project_to_meters(lat, lon)
        pt = Point(x, y)
        
        # 1. Check strict containment
        for code, poly in self.state_polygons.items():
            if poly.contains(pt):
                return code
                
        # 2. Check within 10km boundary tolerance as fallback
        nearest_code, dist = self.find_nearest_state_polygon(pt, max_dist=10000.0)
        if nearest_code is not None:
            return nearest_code
            
        raise ValueError("Point is not within any Indian state boundary (10km tolerance).")

    def latlon_to_cell(self, lat: float, lon: float, state_code: str):
        x, y = self.project_to_meters(lat, lon)
        pt = Point(x, y)
        
        poly = self.state_polygons.get(state_code)
        if poly is None or not poly.contains(pt):
            # tolerance fallback: check nearest polygon within 5m
            nearest_code, dist = self.find_nearest_state_polygon(pt, max_dist=5.0)
            if nearest_code is None:
                raise ValueError("Point not inside any state boundary within tolerance")
            state_code = nearest_code
            poly = self.state_polygons[state_code]
            
        cache = self.grid_cache[state_code]
        col = math.floor((x - cache['min_x']) / GRID_CELL_SIZE)
        row = math.floor((y - cache['min_y']) / GRID_CELL_SIZE)
        
        orig_col, orig_row = col, row
        col = max(0, min(col, cache['num_cols'] - 1))
        row = max(0, min(row, cache['num_rows'] - 1))
        
        if col != orig_col or row != orig_row:
            logger.warning(
                f"Clamped grid position for state {state_code}: "
                f"col {orig_col} -> {col} (delta {orig_col - col}), "
                f"row {orig_row} -> {row} (delta {orig_row - row}). "
                f"This may indicate a boundary collision — verify against 5m tolerance fallback."
            )
        
        n = row * cache['num_cols'] + col
        return n, state_code

    def encode_address(self, lat: float, lon: float, state_code: str) -> str:
        n, resolved_state_code = self.latlon_to_cell(lat, lon, state_code)
        cache = self.grid_cache[resolved_state_code]
        D = cache['total_cells']
        
        # Shuffle cell index using Feistel
        m = feistel_encrypt(n, D, self.feistel_key)
        
        # Word/digit encoding
        V = len(self.word_list)
        word1_index = m % V
        temp = m // V
        digit1 = temp % 10
        temp = temp // 10
        word2_index = temp % V
        digit2 = temp // V
        
        if digit2 > cache['digit2_max']:
            raise ValueError(f"Encoding error: digit2 ({digit2}) exceeds digit2_max ({cache['digit2_max']})")
        
        word1 = self.index_to_word[word1_index]
        word2 = self.index_to_word[word2_index]
        
        return f"{resolved_state_code.upper()}/{word1.lower()}{digit1}/{word2.lower()}{digit2}"

    def decode_address(self, address: str):
        if not validate_checksum(address, self.word_to_index):
            raise ValueError("Invalid checksum: address is malformed or corrupted")
            
        state_code, word1, digit1, word2, digit2, _ = parse_address_parts(address)
        
        w1_idx = self.word_to_index[word1]
        w2_idx = self.word_to_index[word2]
        
        V = len(self.word_list)
        # Reconstruct m
        # m = word1_index + V * (digit1 + 10 * (word2_index + V * digit2))
        m = w1_idx + V * (digit1 + 10 * (w2_idx + V * digit2))
        
        cache = self.grid_cache[state_code]
        D = cache['total_cells']
        
        # Unshuffle to original cell index
        n = feistel_decrypt(m, D, self.feistel_key)
        
        row = n // cache['num_cols']
        col = n % cache['num_cols']
        
        # Convert row/col back to center coordinates of 3x3 cell
        x = cache['min_x'] + col * GRID_CELL_SIZE + (GRID_CELL_SIZE / 2.0)
        y = cache['min_y'] + row * GRID_CELL_SIZE + (GRID_CELL_SIZE / 2.0)
        
        lat, lon = self.project_to_wgs84(x, y)
        return lat, lon, state_code
