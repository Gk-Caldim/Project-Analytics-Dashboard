import os
import sys
import time
import subprocess
import msvcrt

def get_choice_with_timeout(timeout=30):
    print("\n==============================================")
    print("   INDUSTRIAL ANALYTICS SERVER LAUNCHER   ")
    print("==============================================")
    print("\nSelect Database Connection:")
    print("1) Local (PostgreSQL via DBeaver)")
    print("2) Cloud (Supabase)")
    print(f"\n[Timer: {timeout}s] Defaulting to Cloud if no selection is made.")
    print("\nSelection (1/2): ", end='', flush=True)

    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if msvcrt.kbhit():
            char = msvcrt.getch().decode('utf-8')
            if char == '1':
                print("1 (Local)")
                return '1'
            elif char == '2':
                print("2 (Cloud)")
                return '2'
            elif char in ['\r', '\n']:
                print("\n>>> Defaulting to Cloud...")
                return '2'
        
        # Optional: update timer every second
        # (This might be too noisy if not handled carefully, so skipping for now)
        time.sleep(0.05)
    
    print("\n\n>>> Timeout reached. Defaulting to CLOUD...")
    return '2'

if __name__ == "__main__":
    choice = get_choice_with_timeout(30)

    if choice == '1':
        os.environ['DB_TYPE'] = 'local'
        print("\n>>> CONFIG: LOCAL DATABASE SELECTED")
    else:
        os.environ['DB_TYPE'] = 'cloud'
        print("\n>>> CONFIG: CLOUD DATABASE SELECTED")

    print(">>> Launching Uvicorn...\n")
    
    try:
        # Using subprocess.run to execute uvicorn
        # The environment variable DB_TYPE is inherited by the subprocess
        subprocess.run(["uvicorn", "app.main:app", "--reload"], shell=True)
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
    except Exception as e:
        print(f"\nError launching server: {e}")
