from unittest.mock import MagicMock

mock_db = MagicMock()
mock_proj = "mock_proj"
mock_upload = "mock_upload"

mock_db.query.return_value.all.side_effect = [
    [mock_proj],
    [mock_upload],
]

# Query 1
res1 = mock_db.query("Proj").all()
print("res1:", res1)

# Query 2
res2 = mock_db.query("Upload").filter("status").all()
print("res2:", res2)
