import sys
import os

def run():
    print(f"=== Starting Programmatic MOM Test Runner ===")
    print(f"Python Executable: {sys.executable}")
    print(f"Current Directory: {os.getcwd()}")
    
    try:
        import pytest
        print("Successfully imported pytest!")
    except ImportError as e:
        print(f"ERROR: Failed to import pytest: {e}")
        print("Sys.path:")
        for p in sys.path:
            print(f"  {p}")
        return

    test_file = r"C:\Project_Dashboard\Project-Analytics-Dashboard\backend\tests\test_mom.py"
    print(f"Running pytest programmatically on: {test_file}\n")
    sys.stdout.flush()
    
    # Run pytest programmatically
    # pytest.main returns an ExitCode enum or int
    exit_code = pytest.main([test_file, "-v", "--tb=short"])
    
    print(f"\n=== Pytest completed with exit code: {exit_code} ===")

if __name__ == "__main__":
    run()
