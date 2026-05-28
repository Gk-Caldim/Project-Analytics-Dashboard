import shutil
import os

src = r"C:\Users\prade\.gemini\antigravity-ide\brain\3244dd24-55c0-4025-8a1a-2f928809eef3\editorial_sketch_1779798433409.png"
dst = r"c:\Project_Dashboard\Project-Analytics-Dashboard\frontend\public\editorial_sketch.png"

print(f"Copying from {src} to {dst}")
if os.path.exists(src):
    shutil.copy(src, dst)
    print("Success!")
else:
    print("Error: Source file does not exist!")
