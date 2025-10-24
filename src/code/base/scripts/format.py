import sys
import black
import traceback
import json
import os
from pathlib import Path, PureWindowsPath

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

def normalize_path(raw_path: str) -> str:
    """
    Accept paths like '/C:/Home/...' and convert to 'C:/Home/...' on Windows.
    Also normalizes separators and removes redundant segments.
    """
    p = raw_path

    # Handle leading slash before drive letter: '/C:/foo' -> 'C:/foo'
    if len(p) >= 4 and p[0] == '/' and p[1].isalpha() and p[2:4] == ':/':
        p = p[1:]

    # Handle double-leading slashes: '//C:/foo' -> 'C:/foo'
    if len(p) >= 5 and p[:2] == '//' and p[2].isalpha() and p[3:5] == ':/':
        p = p[2:]

    if os.name == 'nt':
        # Use pathlib to represent the native path cleanly; forward slashes are fine.
        # Avoid resolve() to not touch filesystem; str(Path) yields native form. [Pathlib docs]
        try:
            # If the input looks like a Windows path with drive, ensure Windows semantics
            if (len(p) >= 2 and p[1:2] == ':') or (p.startswith('\\\\') or p.startswith('//')):
                p = str(Path(PureWindowsPath(p)))
            else:
                p = str(Path(p))
        except Exception:
            p = os.path.normpath(p)
    else:
        # Non-Windows: just normalize redundant parts
        p = os.path.normpath(p)

    return p

def main(filepath):
    try:
        normalized = normalize_path(filepath)
        with open(normalized, 'r', encoding='utf-8') as f:
            source = f.read()

        formatted_content = format_source(source)
        # Emit exactly one JSON object on stdout. Keep stdout clean of logs. [Python json docs]
        print(json.dumps({"formatted_content": formatted_content}))
    except Exception as e:
        # Send errors to stderr so caller can parse stdout JSON safely. [Node child_process behavior]
        print(f"Failed to process {filepath}: {e}", file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python formatter.py <file_path>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])
