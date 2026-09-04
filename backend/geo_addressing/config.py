import os

# Geographic Addressing System Configuration

# The Feistel Key must be a fixed constant. NEVER rotate this key once addresses
# are issued, as rotation will invalidate all previously issued addresses.
FEISTEL_KEY = b"IndiaAddressingSystemSecureFeistelKey2026"

# Slotted paths for boundary and word list.
# These can be overridden via environment variables or explicitly in code.
BOUNDARY_DATA_PATH = os.environ.get("INDIA_BOUNDARY_PATH", "geo_addressing/data/geoBoundaries-IND-ADM1.geojson")
WORDLIST_PATH = os.environ.get("WORDLIST_PATH", "geo_addressing/data/wordlist.csv")

# Coordinate reference system details
CRS_PROJECTION = "EPSG:7755"  # India Lambert Conformal Conic

# Precision grid configuration
GRID_CELL_SIZE = 3.0  # 3m x 3m grid cells

# Vocabulary size for encoding
VOCAB_SIZE = 62613

# API Key for locking down the endpoints (if configured)
GEO_ADDRESSING_API_KEY = os.environ.get("GEO_ADDRESSING_API_KEY", "")

