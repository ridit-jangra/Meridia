import sys
import subprocess
import os
import uuid
import platform
import shutil
import json

def execute_python_file(target_file, *args):
    """
    Cross-platform Python file execution with completion marker
    """
    completion_marker = f"__EXECUTION_COMPLETE_{uuid.uuid4().hex[:8]}__"
    
    try:
        # Check if target file exists
        if not os.path.exists(target_file):
            print(f"Error: File '{target_file}' not found")
            print(f"{completion_marker}_ERROR")
            return 1
            
        # Check if file is readable
        if not os.access(target_file, os.R_OK):
            print(f"Error: No read permission for '{target_file}'")
            print(f"{completion_marker}_ERROR")
            return 1
        
        # Cross-platform Python executable detection
        python_cmd = get_python_command()
        
        # Build command
        cmd = [python_cmd, target_file] + list(args)
        
        # Execute the target Python file
        result = subprocess.run(
            cmd,
            capture_output=False,
            text=True,
            cwd=os.getcwd(),
            shell=False,
            env=os.environ.copy()
        )
        
        # Print completion marker with exit code
        if result.returncode == 0:
            print(f"\n{completion_marker}_SUCCESS")
        else:
            print(f"\n{completion_marker}_ERROR_{result.returncode}")
        
        return result.returncode
        
    except PermissionError as e:
        print(f"Permission error: {e}")
        print(f"{completion_marker}_PERMISSION_ERROR")
        return 126
    except FileNotFoundError as e:
        print(f"File or Python interpreter not found: {e}")
        print(f"{completion_marker}_FILE_NOT_FOUND")
        return 127
    except KeyboardInterrupt:
        print(f"\n{completion_marker}_INTERRUPTED")
        return 130
    except subprocess.TimeoutExpired as e:
        print(f"Process timed out: {e}")
        print(f"{completion_marker}_TIMEOUT")
        return 124
    except OSError as e:
        print(f"OS error: {e}")
        print(f"{completion_marker}_OS_ERROR")
        return 1
    except Exception as e:
        print(f"Python execution error: {e}")
        print(f"{completion_marker}_EXCEPTION")
        return 1

def execute_node_file(target_file, *args):
    """
    Cross-platform Node.js file execution with completion marker
    """
    completion_marker = f"__EXECUTION_COMPLETE_{uuid.uuid4().hex[:8]}__"
    
    try:
        # Check if target file exists
        if not os.path.exists(target_file):
            print(f"Error: File '{target_file}' not found")
            print(f"{completion_marker}_ERROR")
            return 1
            
        # Check if file is readable
        if not os.access(target_file, os.R_OK):
            print(f"Error: No read permission for '{target_file}'")
            print(f"{completion_marker}_ERROR")
            return 1
        
        # Get Node.js command
        node_cmd = get_node_command()
        if not node_cmd:
            print("Error: Node.js not found. Please install Node.js and add it to PATH")
            print(f"{completion_marker}_NODE_NOT_FOUND")
            return 127
        
        # Build command
        cmd = [node_cmd, target_file] + list(args)
        
        # Execute the target Node.js file
        result = subprocess.run(
            cmd,
            capture_output=False,
            text=True,
            cwd=os.getcwd(),
            shell=False,
            env=os.environ.copy()
        )
        
        # Print completion marker with exit code
        if result.returncode == 0:
            print(f"\n{completion_marker}_SUCCESS")
        else:
            print(f"\n{completion_marker}_ERROR_{result.returncode}")
        
        return result.returncode
        
    except PermissionError as e:
        print(f"Permission error: {e}")
        print(f"{completion_marker}_PERMISSION_ERROR")
        return 126
    except FileNotFoundError as e:
        print(f"File or Node.js interpreter not found: {e}")
        print(f"{completion_marker}_FILE_NOT_FOUND")
        return 127
    except KeyboardInterrupt:
        print(f"\n{completion_marker}_INTERRUPTED")
        return 130
    except subprocess.TimeoutExpired as e:
        print(f"Process timed out: {e}")
        print(f"{completion_marker}_TIMEOUT")
        return 124
    except OSError as e:
        print(f"OS error: {e}")
        print(f"{completion_marker}_OS_ERROR")
        return 1
    except Exception as e:
        print(f"Node.js execution error: {e}")
        print(f"{completion_marker}_EXCEPTION")
        return 1

def execute_rust_project(target_path=None, *args):
    """
    Cross-platform Rust project execution using cargo run
    """
    completion_marker = f"__EXECUTION_COMPLETE_{uuid.uuid4().hex[:8]}__"
    
    try:
        # Determine project directory
        if target_path and os.path.isfile(target_path):
            # If target is a .rs file, look for Cargo.toml in parent directories
            project_dir = find_cargo_project_root(os.path.dirname(target_path))
            if not project_dir:
                print(f"Error: No Cargo.toml found for Rust file '{target_path}'")
                print("Try running from a Cargo project directory or specify a project path")
                print(f"{completion_marker}_NO_CARGO_PROJECT")
                return 1
        elif target_path and os.path.isdir(target_path):
            project_dir = target_path
        else:
            # Use current directory
            project_dir = os.getcwd()
        
        # Check if Cargo.toml exists
        cargo_toml = os.path.join(project_dir, "Cargo.toml")
        if not os.path.exists(cargo_toml):
            print(f"Error: No Cargo.toml found in '{project_dir}'")
            print("This doesn't appear to be a Rust project directory")
            print(f"{completion_marker}_NO_CARGO_TOML")
            return 1
        
        # Get Cargo command
        cargo_cmd = get_cargo_command()
        if not cargo_cmd:
            print("Error: Cargo not found. Please install Rust and Cargo")
            print(f"{completion_marker}_CARGO_NOT_FOUND")
            return 127
        
        # Build command - use cargo run for execution
        cmd = [cargo_cmd, "run"]
        
        # Add -- separator if there are arguments to pass to the program
        if args:
            cmd.extend(["--"] + list(args))
        
        # Execute the Rust project
        result = subprocess.run(
            cmd,
            capture_output=False,
            text=True,
            cwd=project_dir,
            shell=False,
            env=os.environ.copy()
        )
        
        # Print completion marker with exit code
        if result.returncode == 0:
            print(f"\n{completion_marker}_SUCCESS")
        else:
            print(f"\n{completion_marker}_ERROR_{result.returncode}")
        
        return result.returncode
        
    except PermissionError as e:
        print(f"Permission error: {e}")
        print(f"{completion_marker}_PERMISSION_ERROR")
        return 126
    except FileNotFoundError as e:
        print(f"File or Cargo not found: {e}")
        print(f"{completion_marker}_FILE_NOT_FOUND")
        return 127
    except KeyboardInterrupt:
        print(f"\n{completion_marker}_INTERRUPTED")
        return 130
    except subprocess.TimeoutExpired as e:
        print(f"Process timed out: {e}")
        print(f"{completion_marker}_TIMEOUT")
        return 124
    except OSError as e:
        print(f"OS error: {e}")
        print(f"{completion_marker}_OS_ERROR")
        return 1
    except Exception as e:
        print(f"Rust execution error: {e}")
        print(f"{completion_marker}_EXCEPTION")
        return 1

def find_cargo_project_root(start_dir):
    """
    Find the root directory of a Cargo project by looking for Cargo.toml
    """
    current_dir = os.path.abspath(start_dir)
    
    while current_dir != os.path.dirname(current_dir):  # Stop at filesystem root
        cargo_toml = os.path.join(current_dir, "Cargo.toml")
        if os.path.exists(cargo_toml):
            return current_dir
        current_dir = os.path.dirname(current_dir)
    
    return None

def get_python_command():
    """
    Get the appropriate Python command for the current platform
    """
    python_commands = ["python"]
    
    for cmd in python_commands:
        if shutil.which(cmd):
            return cmd
    
    # Fallback to sys.executable
    print("Warning: No python command found in PATH, using sys.executable")
    return sys.executable

def get_node_command():
    """
    Get the appropriate Node.js command for the current platform
    """
    node_commands = ["node"]
    
    for cmd in node_commands:
        if shutil.which(cmd):
            return cmd
    
    return None

def get_cargo_command():
    """
    Get the appropriate Cargo command for the current platform
    """
    cargo_commands = ["cargo"]
    
    for cmd in cargo_commands:
        if shutil.which(cmd):
            return cmd
    
    return None

def check_python_installation():
    """
    Verify Python installation across platforms
    """
    try:
        python_cmd = get_python_command()
        result = subprocess.run(
            [python_cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False

def check_node_installation():
    """
    Verify Node.js installation across platforms
    """
    try:
        node_cmd = get_node_command()
        if not node_cmd:
            return False
        result = subprocess.run(
            [node_cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False

def check_rust_installation():
    """
    Verify Rust/Cargo installation across platforms
    """
    try:
        cargo_cmd = get_cargo_command()
        if not cargo_cmd:
            return False
        result = subprocess.run(
            [cargo_cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False

def detect_file_type(file_path):
    """
    Detect the type of file based on extension
    """
    if not file_path:
        return None
    
    _, ext = os.path.splitext(file_path.lower())
    
    if ext == '.py':
        return 'python'
    elif ext in ['.js', '.mjs', '.cjs']:
        return 'node'
    elif ext == '.rs':
        return 'rust'
    else:
        return None

def show_system_info():
    """
    Display system and runtime information
    """
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Architecture: {platform.machine()}")
    
    # Python info
    python_cmd = get_python_command()
    print(f"Python: {python_cmd} {'✓' if check_python_installation() else '✗'}")
    
    # Node.js info
    node_cmd = get_node_command()
    node_status = '✓' if check_node_installation() else '✗'
    print(f"Node.js: {node_cmd or 'Not found'} {node_status}")
    
    # Rust/Cargo info
    cargo_cmd = get_cargo_command()
    rust_status = '✓' if check_rust_installation() else '✗'
    print(f"Rust/Cargo: {cargo_cmd or 'Not found'} {rust_status}")

if __name__ == "__main__":
    completion_marker = f"__EXECUTION_COMPLETE_{uuid.uuid4().hex[:8]}__"
    
    try:
        if len(sys.argv) < 2:
            print("Multi-Language Execution Tool")
            print("Usage:")
            print("  python execute_with_marker.py <file_or_path> [args...]")
            print("  python execute_with_marker.py --info  # Show system information")
            print()
            print("Supported file types:")
            print("  .py  - Python files")
            print("  .js/.mjs/.cjs - Node.js files")
            print("  .rs  - Rust files (requires Cargo project)")
            print("  directory - Rust project directory (with Cargo.toml)")
            print()
            show_system_info()
            print(f"{completion_marker}_USAGE_ERROR")
            sys.exit(1)
        
        if sys.argv[1] == "--info":
            show_system_info()
            print(f"{completion_marker}_SUCCESS")
            sys.exit(0)
        
        target = sys.argv[1]
        args = sys.argv[2:] if len(sys.argv) > 2 else []
        
        # Auto-detect file type or check if it's a directory
        if os.path.isdir(target):
            # Check if it's a Rust project directory
            if os.path.exists(os.path.join(target, "Cargo.toml")):
                file_type = 'rust'
            else:
                print(f"Error: Directory '{target}' is not a recognized project type")
                print("For Rust projects, ensure Cargo.toml exists")
                print(f"{completion_marker}_UNSUPPORTED_DIRECTORY")
                sys.exit(1)
        else:
            file_type = detect_file_type(target)
        
        if not file_type:
            print(f"Error: Unsupported file type for '{target}'")
            print("Supported extensions: .py, .js, .mjs, .cjs, .rs")
            print(f"{completion_marker}_UNSUPPORTED_FILE_TYPE")
            sys.exit(1)
        
        # Execute based on file type
        if file_type == 'python':
            if not check_python_installation():
                print("Error: Python interpreter not properly configured")
                print(f"{completion_marker}_PYTHON_NOT_CONFIGURED")
                sys.exit(1)
            exit_code = execute_python_file(target, *args)
        elif file_type == 'node':
            if not check_node_installation():
                print("Error: Node.js not properly configured")
                print(f"{completion_marker}_NODE_NOT_CONFIGURED")
                sys.exit(1)
            exit_code = execute_node_file(target, *args)
        elif file_type == 'rust':
            if not check_rust_installation():
                print("Error: Rust/Cargo not properly configured")
                print(f"{completion_marker}_RUST_NOT_CONFIGURED")
                sys.exit(1)
            exit_code = execute_rust_project(target, *args)
        else:
            print(f"Error: Unknown file type '{file_type}'")
            print(f"{completion_marker}_UNKNOWN_FILE_TYPE")
            sys.exit(1)
        
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        print(f"\n{completion_marker}_MAIN_INTERRUPTED")
        sys.exit(130)
    except Exception as e:
        print(f"Fatal error: {e}")
        print(f"{completion_marker}_FATAL_ERROR")
        sys.exit(1)
