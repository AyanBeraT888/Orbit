import sys
import argparse
from geo_addressing.config import BOUNDARY_DATA_PATH, WORDLIST_PATH
from geo_addressing.core import AddressingSystem

def get_system():
    try:
        return AddressingSystem(boundary_source=BOUNDARY_DATA_PATH, wordlist_source=WORDLIST_PATH)
    except Exception as e:
        sys.stderr.write(f"Initialization Error: Failed to load addressing system: {str(e)}\n")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Geographic Addressing System for India.\n"
            "Converts lat/long points in India into short addresses of the form:\n"
            "  statecode/word1digit1/word2digit2checksum\n"
            "Example: WB/word1234/word4567k"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", required=True, help="Subcommands")
    
    # Encode Subcommand
    encode_parser = subparsers.add_parser("encode", help="Convert lat/lon coordinate into a geographic address")
    encode_parser.add_argument("--lat", type=float, required=True, help="Latitude")
    encode_parser.add_argument("--lon", type=float, required=True, help="Longitude")
    encode_parser.add_argument("--state", type=str, required=True, help="State code (e.g., WB, MH)")
    
    # Decode Subcommand
    decode_parser = subparsers.add_parser("decode", help="Convert a geographic address into lat/lon coordinates")
    decode_parser.add_argument("--address", type=str, required=True, help="Geographic address to decode")
    
    args = parser.parse_args()
    
    system = get_system()
    
    if args.command == "encode":
        try:
            address = system.encode_address(args.lat, args.lon, args.state)
            sys.stdout.write(f"{address}\n")
        except Exception as e:
            sys.stderr.write(f"Error: {str(e)}\n")
            sys.exit(1)
            
    elif args.command == "decode":
        try:
            lat, lon, state_code = system.decode_address(args.address)
            sys.stdout.write(f"{lat:.6f}, {lon:.6f}, {state_code}\n")
        except Exception as e:
            sys.stderr.write(f"Error: {str(e)}\n")
            sys.exit(1)

if __name__ == "__main__":
    main()
