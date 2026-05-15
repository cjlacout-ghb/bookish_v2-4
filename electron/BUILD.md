### Step 1 — Build the backend
  cd backend
  pip install -r requirements.txt
  cd ../electron
  pyinstaller bookish_backend.spec --distpath backend_dist/

### Step 2 — Build the frontend
  cd ../frontend
  npm run build

### Step 3 — Package with Electron
  cd ../electron
  npm install
  npm run build
