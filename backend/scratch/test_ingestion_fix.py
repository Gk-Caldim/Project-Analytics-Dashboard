import pandas as pd
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath('.'))

from app.utils.ingestion import IngestionEngine

def test_header_detection():
    engine = IngestionEngine()
    
    # Simulate a messy tracker with a Title row
    data = [
        ["TVS Industrial Analytics", "", "", ""], # Row 1: Title (low density)
        ["Part Development Tracker", "", "", ""], # Row 2: Subtitle (low density)
        ["", "", "", ""],                         # Row 3: Blank
        ["Part Name", "Milestone", "Planned", "Actual"], # Row 4: REAL HEADER (high density)
        ["Engine", "Design", "2023-01-01", "2023-01-05"],
        ["Gearbox", "Build", "2023-02-01", ""]
    ]
    
    # Convert to DF (as it would be in memory or DB)
    df = pd.DataFrame(data[1:], columns=data[0])
    print("Initial DF Columns (Incorrect):", df.columns.tolist())
    
    # Process using ingest_dataframe
    processed = engine.ingest_dataframe(df)
    
    if processed:
        headers = list(processed[0].keys())
        print("Optimized Headers:", headers)
        
        # Check if "Part Name" is a header
        if "part_name" in headers or "Part Name" in headers:
            print("✅ SUCCESS: Correct header detected!")
        else:
            print("❌ FAILURE: Wrong header detected!")
            print("Detected headers were:", headers)
    else:
        print("❌ FAILURE: No data returned")

if __name__ == "__main__":
    test_header_detection()
