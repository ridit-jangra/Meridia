import sys
import black
import traceback
import json


def format_source(source_code: str):
    try:
        formatted_source = black.format_str(source_code, mode=black.FileMode())
        return formatted_source
    except black.InvalidInput:
        print("Warning: Could not format due to parse errors. Returning original source.", file=sys.stderr)
        return source_code
    except Exception as e:
        print(f"Error during formatting: {e}", file=sys.stderr)
        traceback.print_exc()
        return source_code


def main():
    try:
        if len(sys.argv) != 2:
            print("Usage: python format.py <text_or_base64>", file=sys.stderr)
            sys.exit(1)
        
        input_text = sys.argv[1]
        
        source = input_text.strip('"').strip("'")
        
        formatted_content = format_source(source)
        
        print(json.dumps({"formatted_content": formatted_content}))
    except Exception as e:
        print(f"Failed to process input: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
