import os

def convert():
    backend_dir = r"C:\Project_Dashboard\Project-Analytics-Dashboard\backend"
    src = os.path.join(backend_dir, "test_out.txt")
    dest = os.path.join(backend_dir, "test_out_utf8.txt")
    
    if not os.path.exists(src):
        print(f"Error: {src} does not exist")
        return
        
    try:
        # Try reading with utf-16 (both LE and BE variants can be handled automatically by 'utf-16')
        with open(src, "r", encoding="utf-16") as f:
            content = f.read()
            
        with open(dest, "w", encoding="utf-8") as f:
            f.write(content)
            
        print(f"Successfully converted {src} (UTF-16) to {dest} (UTF-8)!")
        print(f"Converted size: {len(content)} characters")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    convert()
