# 🚀 SIH 2026 — AI Packaged Commodity Compliance Scanner
**Problem Statement:** SIH26034 (Legal Metrology Compliance Enforcement)  
**Team:** 404 The Optimists

---

## ⚡ Quick Start (Windows — 1-Click Launch)

If you are on Windows, you can use the automated batch scripts:

1. **First-time setup:** Double-click `setup_dependencies.bat` (installs Python & npm dependencies).
2. **Launch everything:** Double-click `start_all.bat`.
3. Open your browser at: **`http://localhost:5173`**

---

## 🛠️ Manual Step-by-Step Instructions (Windows / Mac / Linux)

### 📋 Prerequisites
Make sure you have installed:
- **Python 3.10+** (Python 3.10, 3.11, or 3.12) → [python.org](https://www.python.org/) (Make sure to check *"Add python.exe to PATH"* during installation)
- **Node.js 18+** → [nodejs.org](https://nodejs.org/)
- **Git** → [git-scm.com](https://git-scm.com/)

---

### Step 1: Open 2 Terminal Windows

---

### Step 2: Start the Backend (Terminal 1)

```bash
# Navigate to the backend directory
cd backend

# (Optional but recommended) Create and activate a virtual environment:
# On Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
venv\Scripts\activate.bat
# On macOS / Linux:
# source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Run the FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
✅ Verify Backend is running: Open `http://127.0.0.1:8000/health` in your browser. You should see `{"status":"healthy"}`.

---

### Step 3: Start the Frontend (Terminal 2)

```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite React development server
npm run dev
```
✅ Verify Frontend is running: Open `http://localhost:5173` in your browser.

---

## 🔍 How to Test the Scanner (Demo Flow)

1. Open `http://localhost:5173` in your browser.
2. Click **"Scanner"** in the top navigation bar.
3. Test any of the 3 modes:
   - **Mode A: 1-Click FMCG Test Pack Carousel**:
     - Click **Parle-G** (shows 100% statutory compliance + GS1 India verification).
     - Click **Lay's** (shows statutory non-compliance violations under Rule 6).
   - **Mode B: Direct Barcode / GTIN-13 Lookup**:
     - Enter barcode `8901058852467` (Maggi Noodles) and click **Scan & Inspect**.
   - **Mode C: Image / Camera Scan**:
     - Upload any packaging label image (front/back/sides) or take a live photo.
4. Click **"Download Official Audit PDF"** to get the court-admissible legal report with Section 36 citations.

---

## 🔑 Environment Variables (.env)
The project comes pre-configured with a working Groq API key in `backend/.env`. If you want to use your own Groq key:
1. Get a free API key at [console.groq.com](https://console.groq.com/).
2. Edit `backend/.env` and update:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=qwen/qwen3.8-27b
   DATABASE_URL=sqlite:///./sih2026.db
   ```

---

## 👥 Default Demo Credentials (for Protected Inspector Routes)
- **Inspector Account:** `inspector@sih.gov.in` / `demo2026`
- **Administrator Account:** `admin@sih.gov.in` / `admin2026`
*(Note: Scanning is also available without logging in!)*
