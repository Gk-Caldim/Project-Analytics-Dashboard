import sys
try:
    import openpyxl
    print("SUCCESS: openpyxl is installed")
except ImportError as e:
    print(f"FAILED: {e}")
