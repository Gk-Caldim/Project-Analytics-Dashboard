import pandas as pd

file_path = "static/uploads/trackers/tracker_sample.xlsx"
try:
    df = pd.read_excel(file_path, engine='openpyxl')
    df = df.fillna("")
    headers = df.columns.tolist()
    data = df.values.tolist()
    
    result = {
        "headers": headers,
        "data": data,
        "fileData": {
            "fileName": "tracker_sample.xlsx",
            "headers": headers,
            "data": data,
            "sheets": [{"name": "Sheet1", "headers": headers, "data": data}]
        }
    }
    print("Success")
except Exception as e:
    print(f"Error reading legacy file {file_path}: {e}")
