import pandas as pd
from app.utils.ingestion import IngestionEngine

# Mock data similar to user's screenshot
data = [
    ["S.No", "System", "Part Number", "Part Description"],
    [1, "CCV", "F8S01422", "Crankcase"],
    [2, "Intake", "F8S01522", "Intake Manifold"]
]
df = pd.DataFrame(data, columns=["Unnamed: 0", "Unnamed: 1", "Unnamed: 2", "Unnamed: 3"])

engine = IngestionEngine()
processed = engine.ingest_dataframe(df)

print("Headers found:", processed[0].keys())
print("First row:", processed[0])
