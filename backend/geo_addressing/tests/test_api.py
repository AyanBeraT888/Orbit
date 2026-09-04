import pytest
from fastapi.testclient import TestClient
from geo_addressing.api import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_api_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["states_loaded"] == 36

def test_api_encode_decode_roundtrip(client):
    # Encode Victoria Memorial, Kolkata in WB
    encode_response = client.get("/encode?lat=22.5448&lon=88.3426&state=WB")
    assert encode_response.status_code == 200
    encode_data = encode_response.json()
    assert "address" in encode_data
    address = encode_data["address"]
    
    # Decode the address
    import urllib.parse
    address_quoted = urllib.parse.quote(address)
    decode_response = client.get(f"/decode?address={address_quoted}")
    assert decode_response.status_code == 200
    decode_data = decode_response.json()
    assert decode_data["state_code"] == "WB"
    assert abs(decode_data["lat"] - 22.5448) < 0.0001
    assert abs(decode_data["lon"] - 88.3426) < 0.0001

def test_api_invalid_coordinates_bbox(client):
    # Lat/Lon obviously outside India (lat=0, lon=0)
    response = client.get("/encode?lat=0.0&lon=0.0&state=WB")
    assert response.status_code == 400
    assert "error" in response.json() or "detail" in response.json()

def test_api_invalid_checksum(client):
    # Invalid checksum format
    response = client.get("/decode?address=WB/word1005/word2001x")
    assert response.status_code == 400
    assert "detail" in response.json()

def test_api_get_state(client):
    # Victoria Memorial, Kolkata in WB
    response = client.get("/state?lat=22.5448&lon=88.3426")
    assert response.status_code == 200
    data = response.json()
    assert data["state_code"] == "WB"

def test_api_encode_without_state(client):
    # Encode Victoria Memorial, Kolkata without providing state
    encode_response = client.get("/encode?lat=22.5448&lon=88.3426")
    assert encode_response.status_code == 200
    encode_data = encode_response.json()
    assert "address" in encode_data
    address = encode_data["address"]
    assert address.startswith("WB/")

def test_api_grid(client):
    # Fetch grid for a tiny bounding box around Victoria Memorial, Kolkata
    # 22.5445 to 22.5450 Lat, 88.3420 to 88.3430 Lon (about 100m wide)
    response = client.get("/grid?min_lat=22.5445&min_lon=88.3420&max_lat=22.5450&max_lon=88.3430")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0
    # Check that it contains LineString features
    for feature in data["features"]:
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] in ["LineString", "Point"]

def test_api_grid_too_large(client):
    # Bounding box coordinates wider than 2km
    response = client.get("/grid?min_lat=22.0&min_lon=88.0&max_lat=22.1&max_lon=88.1")
    assert response.status_code == 400
    assert "Bounding box too large" in response.json()["detail"]


