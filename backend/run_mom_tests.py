import subprocess
import os

def run_tests():
    backend_dir = r"C:\Project_Dashboard\Project-Analytics-Dashboard\backend"
    pytest_path = os.path.join(backend_dir, "venv", "Scripts", "pytest.exe")
    test_file = os.path.join(backend_dir, "tests", "test_mom.py")
    output_file = os.path.join(backend_dir, "test_mom_results.txt")

    print(f"Starting test runner...")
    print(f"Pytest Path: {pytest_path}")
    print(f"Test File: {test_file}")
    print(f"Output File: {output_file}")

    if not os.path.exists(pytest_path):
        print(f"ERROR: Pytest executable not found at {pytest_path}")
        return

    try:
        # Run pytest, capturing stdout and stderr
        result = subprocess.run(
            [pytest_path, test_file, "-v", "--tb=short"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            cwd=backend_dir
        )
        
        # Write clean UTF-8 output
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(result.stdout)
            
        print(f"Pytest finished with exit code: {result.returncode}")
        print(f"Output length: {len(result.stdout)} characters")
        print("\n--- FIRST 20 LINES OF TEST OUTPUT ---")
        print("\n".join(result.stdout.splitlines()[:20]))
        print("--------------------------------------")
        
    except Exception as e:
        print(f"Exception during execution: {e}")

if __name__ == "__main__":
    run_tests()
