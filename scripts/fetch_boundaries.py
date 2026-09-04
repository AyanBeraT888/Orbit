import os
import urllib.request

URL = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1.geojson"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "geo_addressing", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "geoBoundaries-IND-ADM1.geojson")

def fetch():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
    if os.path.exists(OUTPUT_PATH):
        print(f"File already exists locally at: {OUTPUT_PATH}")
        # Check size
        size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
        print(f"Local file size: {size_mb:.2f} MB")
        return
        
    print(f"Downloading from {URL} ...")
    urllib.request.urlretrieve(URL, OUTPUT_PATH)
    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"Downloaded successfully. Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    fetch()
