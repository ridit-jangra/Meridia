import sys
import black
import traceback
import json

def format_source(source_code: str):
    try:
        formatted_source = black.format_str(source_code, mode=black.FileMode())
        return formatted_source
    except black.InvalidInput:
        print("Warning: Could not format due to parse errors. Returning original source.")
        return source_code
    except Exception as e:
        print(f"Error during formatting: {e}")
        traceback.print_exc()
        return source_code

def main(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()

        formatted_content = format_source(source)
        print(json.dumps({"formatted_content": formatted_content}))

    except Exception as e:
        print(f"Failed to process {filepath}: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python formatter.py <file_path>")
        sys.exit(1)
    main(sys.argv[1])
