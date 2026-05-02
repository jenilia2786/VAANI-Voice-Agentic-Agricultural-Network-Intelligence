import os
import subprocess
import sys
import shutil

def run_command(command):
    print(f"Executing: {command}")
    try:
        subprocess.check_call(command, shell=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        return False

def setup():
    print("=== VAANI Project Setup ===")
    
    # 1. Navigate to backend if needed (script should be run from project root)
    project_root = os.getcwd()
    backend_dir = os.path.join(project_root, "backend")
    
    if not os.path.exists(backend_dir):
        print("Error: Could not find 'backend' directory. Please run this script from the project root.")
        return

    # 2. Setup virtual environment
    venv_dir = os.path.join(backend_dir, "venv")
    if not os.path.exists(venv_dir):
        print("Creating virtual environment...")
        run_command(f"python -m venv {venv_dir}")
    
    # 3. Install dependencies
    pip_path = os.path.join(venv_dir, "Scripts", "pip") if os.name == "nt" else os.path.join(venv_dir, "bin", "pip")
    print("Installing dependencies...")
    run_command(f"{pip_path} install -r {os.path.join(backend_dir, 'requirements.txt')}")

    # 4. Handle .env file
    env_path = os.path.join(backend_dir, ".env")
    env_example = os.path.join(backend_dir, ".env.example")
    if not os.path.exists(env_path):
        print("Creating .env from .env.example...")
        shutil.copy(env_example, env_path)
        print("IMPORTANT: Please update the API keys in backend/.env")
    else:
        print(".env file already exists.")

    # 5. Check for Firebase Key
    firebase_key = os.path.join(backend_dir, "firebase_key.json")
    if not os.path.exists(firebase_key):
        print("\nNote: 'firebase_key.json' not found. VAANI will run in LOCAL DB mode by default.")
        print("To use Cloud Firestore, place your service account key at 'backend/firebase_key.json'.")

    # 6. Initialize Local DB if missing
    local_db = os.path.join(backend_dir, "local_db.json")
    if not os.path.exists(local_db):
        with open(local_db, "w") as f:
            f.write("{}")
        print("Created empty local_db.json.")

    print("\n=== Setup Complete! ===")
    print("To start the project:")
    print(f"1. cd backend")
    print(f"2. {os.path.join('venv', 'Scripts', 'activate') if os.name == 'nt' else 'source venv/bin/activate'}")
    print(f"3. python main.py")

if __name__ == "__main__":
    setup()
