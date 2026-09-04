import sys
import subprocess
import pytest

def run_cli(args):
    cmd = [sys.executable, "-m", "geo_addressing.cli"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result

def test_cli_encode():
    # Encode Victoria Memorial, Kolkata in WB
    encode_result = run_cli(["encode", "--lat", "22.5448", "--lon", "88.3426", "--state", "WB"])
    assert encode_result.returncode == 0
    address = encode_result.stdout.strip()
    assert address.startswith("WB/")

def test_cli_decode():
    # Decode a known address
    # Address for (22.5448, 88.3426) in WB
    encode_result = run_cli(["encode", "--lat", "22.5448", "--lon", "88.3426", "--state", "WB"])
    assert encode_result.returncode == 0
    address = encode_result.stdout.strip()

    decode_result = run_cli(["decode", "--address", address])
    assert decode_result.returncode == 0
    output = decode_result.stdout.strip()
    
    parts = output.split(", ")
    lat = float(parts[0])
    lon = float(parts[1])
    state = parts[2]
    
    assert state == "WB"
    # Should be close to original
    assert abs(lat - 22.5448) < 0.0001
    assert abs(lon - 88.3426) < 0.0001

def test_cli_decode_invalid_checksum():
    """A decode call with a corrupted/invalid address must exit non-zero and print
    a clear error to stderr, not a raw Python traceback."""
    # First, get a valid address
    encode_result = run_cli(["encode", "--lat", "22.5448", "--lon", "88.3426", "--state", "WB"])
    assert encode_result.returncode == 0
    valid_address = encode_result.stdout.strip()
    
    # Mutate the last character (the checksum) to invalidate it
    last_char = valid_address[-1]
    mutated_char = "A" if last_char != "A" else "B"
    invalid_address = valid_address[:-1] + mutated_char
    
    result = run_cli(["decode", "--address", invalid_address])
    assert result.returncode != 0
    assert "Traceback" not in result.stderr
    assert "Error:" in result.stderr or "Invalid checksum" in result.stderr
    assert len(result.stderr.strip()) > 0
