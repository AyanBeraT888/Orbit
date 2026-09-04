import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException, status, Header, Depends
from fastapi.responses import JSONResponse
from geo_addressing.config import BOUNDARY_DATA_PATH, WORDLIST_PATH, GEO_ADDRESSING_API_KEY
from geo_addressing.core import AddressingSystem

# Dependency to check API Key
async def verify_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    if GEO_ADDRESSING_API_KEY:
        if not x_api_key or x_api_key != GEO_ADDRESSING_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-API-Key header"
            )


# Setup basic logging
logger = logging.getLogger("geo_addressing_api")

# India bounding box (approximate)
MIN_LAT, MAX_LAT = 6.0, 38.0
MIN_LON, MAX_LON = 68.0, 98.0

system = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global system
    logger.info("Initializing AddressingSystem...")
    try:
        system = AddressingSystem(boundary_source=BOUNDARY_DATA_PATH, wordlist_source=WORDLIST_PATH)
        logger.info("AddressingSystem initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize AddressingSystem: {str(e)}")
        raise e
    yield
    # Cleanup if needed
    system = None

app = FastAPI(
    title="Geographic Addressing System API",
    description="API for converting lat/lon points in India to state-relative addresses and back.",
    lifespan=lifespan
)

@app.get("/health")
def health():
    if system is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AddressingSystem is not loaded"
        )
    return {
        "status": "ok",
        "states_loaded": len(system.grid_cache)
    }

@app.get("/state", dependencies=[Depends(verify_api_key)])
def get_state(
    lat: float = Query(..., description="Latitude of the point"),
    lon: float = Query(..., description="Longitude of the point")
):
    if system is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AddressingSystem is not loaded"
        )
        
    if not (MIN_LAT <= lat <= MAX_LAT) or not (MIN_LON <= lon <= MAX_LON):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coordinates ({lat}, {lon}) are outside India's bounding box."
        )
        
    try:
        state_code = system.get_state_from_coords(lat, lon)
        return {"state_code": state_code}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/encode", dependencies=[Depends(verify_api_key)])
def encode(
    lat: float = Query(..., description="Latitude of the point"),
    lon: float = Query(..., description="Longitude of the point"),
    state: str = Query(None, description="Target state code (e.g. WB, MH). If not provided, it will be automatically resolved.")
):
    if system is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AddressingSystem is not loaded"
        )
        
    # Basic bounding box validation
    if not (MIN_LAT <= lat <= MAX_LAT) or not (MIN_LON <= lon <= MAX_LON):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coordinates ({lat}, {lon}) are outside India's bounding box."
        )
        
    try:
        resolved_state = state
        if not resolved_state:
            resolved_state = system.get_state_from_coords(lat, lon)
            
        address = system.encode_address(lat, lon, resolved_state.upper())
        return {"address": address}
    except ValueError as e:
        # e.g., Point not inside state boundary
        if "Point not inside any state boundary" in str(e) or "Point is not within any Indian state boundary" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected encoding error: {str(e)}"
        )

@app.get("/decode", dependencies=[Depends(verify_api_key)])
def decode(address: str = Query(..., description="Geographic address to decode")):
    if system is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AddressingSystem is not loaded"
        )
        
    # Normalize address: replace spaces with '+' (since URL query parameters decode '+' to space)
    normalized_address = address.replace(" ", "+")
    try:
        lat, lon, state_code = system.decode_address(normalized_address)
        return {
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "state_code": state_code
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected decoding error: {str(e)}"
        )

@app.get("/grid", dependencies=[Depends(verify_api_key)])
def get_grid(
    min_lat: float = Query(..., description="Minimum latitude of bounding box"),
    min_lon: float = Query(..., description="Minimum longitude of bounding box"),
    max_lat: float = Query(..., description="Maximum latitude of bounding box"),
    max_lon: float = Query(..., description="Maximum longitude of bounding box")
):
    import math
    from geo_addressing.config import GRID_CELL_SIZE

    if system is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AddressingSystem is not loaded"
        )

    # Basic bounding box validation
    if not (MIN_LAT <= min_lat <= MAX_LAT) or not (MIN_LON <= min_lon <= MAX_LON) or \
       not (MIN_LAT <= max_lat <= MAX_LAT) or not (MIN_LON <= max_lon <= MAX_LON):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates are outside India's bounding box."
        )

    try:
        # Project corner points to meters
        x1, y1 = system.project_to_meters(min_lat, min_lon)
        x2, y2 = system.project_to_meters(max_lat, max_lon)

        # Get bounding box in meters
        box_min_x = min(x1, x2)
        box_max_x = max(x1, x2)
        box_min_y = min(y1, y2)
        box_max_y = max(y1, y2)

        # Check bounds limits (width/height cap of 2km)
        width = box_max_x - box_min_x
        height = box_max_y - box_min_y
        if width > 2000 or height > 2000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bounding box too large. Maximum size is 2km x 2km."
            )

        # Resolve state code from the center of the bounding box
        center_lat = (min_lat + max_lat) / 2.0
        center_lon = (min_lon + max_lon) / 2.0
        state_code = system.get_state_from_coords(center_lat, center_lon)

        cache = system.grid_cache[state_code]
        grid_min_x = cache['min_x']
        grid_min_y = cache['min_y']

        features = []

        # Find overlapping grid cells range
        start_col = math.floor((box_min_x - grid_min_x) / GRID_CELL_SIZE)
        end_col = math.ceil((box_max_x - grid_min_x) / GRID_CELL_SIZE)
        start_row = math.floor((box_min_y - grid_min_y) / GRID_CELL_SIZE)
        end_row = math.ceil((box_max_y - grid_min_y) / GRID_CELL_SIZE)

        # Generate vertical grid lines
        for col in range(start_col, end_col + 1):
            x = grid_min_x + col * GRID_CELL_SIZE
            lat1, lon1 = system.project_to_wgs84(x, box_min_y)
            lat2, lon2 = system.project_to_wgs84(x, box_max_y)
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lon1, lat1], [lon2, lat2]]
                },
                "properties": {
                    "direction": "vertical",
                    "index": col
                }
            })

        # Generate horizontal grid lines
        for row in range(start_row, end_row + 1):
            y = grid_min_y + row * GRID_CELL_SIZE
            lat1, lon1 = system.project_to_wgs84(box_min_x, y)
            lat2, lon2 = system.project_to_wgs84(box_max_x, y)
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lon1, lat1], [lon2, lat2]]
                },
                "properties": {
                    "direction": "horizontal",
                    "index": row
                }
            })

        # Generate center points with labels (geo-address) if bounding box is small enough (~150m) to avoid browser crash
        if width <= 150 and height <= 150:
            for col in range(start_col, end_col):
                for row in range(start_row, end_row):
                    center_x = grid_min_x + (col + 0.5) * GRID_CELL_SIZE
                    center_y = grid_min_y + (row + 0.5) * GRID_CELL_SIZE
                    try:
                        cell_lat, cell_lon = system.project_to_wgs84(center_x, center_y)
                        address = system.encode_address(cell_lat, cell_lon, state_code)
                        features.append({
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": [cell_lon, cell_lat]
                            },
                            "properties": {
                                "type": "label",
                                "address": address
                            }
                        })
                    except Exception:
                        pass

        return {
            "type": "FeatureCollection",
            "features": features
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error generating grid: {str(e)}"
        )
