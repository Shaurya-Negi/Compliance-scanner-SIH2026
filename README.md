# ⚖️ SIH26034 — AI-Powered Packaged Commodity Compliance System
> **Smart India Hackathon 2026** | **Problem Statement ID:** SIH26034  
> **Team:** 404 The Optimists | **Theme:** Legal Metrology (Packaged Commodities) Rules, 2011 Enforcement

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Groq LLaMA 3.1](https://img.shields.io/badge/Groq-LLaMA_3.1_70B-F55036.svg?style=flat)](https://groq.com)
[![PaddleOCR](https://img.shields.io/badge/PaddleOCR-v2.9-blue.svg?style=flat)](https://github.com/PaddlePaddle/PaddleOCR)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

---

## 🎯 Problem Overview

Under the **Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 6)**, every packaged commodity sold in India must carry 9 mandatory statutory declarations. Manual inspection of millions of retail and e-commerce commodities is slow, error-prone, and impossible to scale.

**SIH26034 AI Compliance Scanner** solves this with an end-to-end edge-to-cloud automated pipeline:
1. **Capture**: Phone camera viewfinder or high-resolution packaging photo upload.
2. **Preprocessing & OCR**: OpenCV CLAHE contrast enhancement + PaddleOCR multilingual text & bounding-box extraction.
3. **LLM Parsing**: Groq-accelerated LLaMA 3.1 70B in JSON schema mode extracting 9 declaration entities in <1 second.
4. **Statutory Rule Engine**: Second Schedule font height validation against estimated label surface area, MRP tax inclusion check, date format validation, address PIN validation, customer care verification, and unit sale price checking.
5. **Enforcement Outputs**: Instant compliance score (0-100%), severity-ranked violation breakdown, and downloadable 3-page Legal Metrology Audit PDF report.
6. **Inspector Dashboard**: Centralized inspection tracking, analytics charts, and commodity catalog.

---

## 🏛️ 9 Mandatory Declarations Validated (Rule 6)

| # | Mandatory Declaration | Rule Reference | Validation Criteria |
|---|---|---|---|
| 1 | **Common/Generic Name** | Rule 6(1)(a) | Must explicitly name the packaged commodity. |
| 2 | **Net Quantity & Font Height** | Rule 6(1)(b) + Second Schedule | Net weight/volume + minimum font height in mm based on label area ($\le 25\,\text{cm}^2 \to 1.0\,\text{mm}$, $\le 100\,\text{cm}^2 \to 2.0\,\text{mm}$, $\le 500\,\text{cm}^2 \to 4.0\,\text{mm}$, $> 500\,\text{cm}^2 \to 6.0\,\text{mm}$). |
| 3 | **Maximum Retail Price (MRP)** | Rule 6(1)(c) | Must include explicit ₹ price and statutory wording *"inclusive of all taxes"*. |
| 4 | **Mfg / Packing / Import Date** | Rule 6(1)(d) | Standard `MM/YYYY` or `DD/MM/YYYY` date format. |
| 5 | **Manufacturer / Packer Address** | Rule 6(1)(e) | Complete physical address with valid 6-digit Indian Postal PIN code. |
| 6 | **Consumer Care Contact** | Rule 6(1)(f) | Complete consumer grievance redressal contact including telephone number AND email address. |
| 7 | **Country of Origin** | Rule 6(1)(g) | Mandatory country declaration (e.g., India, Made in India). |
| 8 | **Unit Sale Price (USP)** | Rule 6(1)(h) | Price per unit (e.g., ₹/g, ₹/ml, ₹/piece). |
| 9 | **Best Before / Expiry Date** | Rule 6(1)(i) | Mandatory for perishable and edible commodities. |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Python 3.8+** (64-bit recommended)
- **Node.js 18+** and **npm**
- Free **Groq API Key** (get instantly from [console.groq.com](https://console.groq.com))

---

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv

# On Windows (PowerShell/Command Prompt):
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
copy .env.example .env     # Windows
cp .env.example .env       # Linux/macOS
```

Edit `backend/.env` with your API keys:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
DATABASE_URL=sqlite:///./sih2026.db
JWT_SECRET_KEY=sih2026_super_secret_jwt_key_hackathon_demo
```

Start the FastAPI development server:
```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API is running at: `http://127.0.0.1:8000`
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`

---

### Step 2: Frontend Setup

Open a new terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.example .env     # Windows
cp .env.example .env       # Linux/macOS

# Start Vite dev server
npm run dev
```
- Web Application is running at: `http://localhost:5173`

---

## 🔑 Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Inspector (Default)** | `inspector@sih.gov.in` | `demo2026` | Full access to Inspector Dashboard, analytics, and scans |
| **Public Consumer** | *No login needed* | *N/A* | Instant camera scanner and compliance reports |

*(You can also register a new account on the `/login` screen)*

---

## 🌐 Cloud Deployment Guide (Free Tier)

### 1. Backend on Render.com (Web Service)
1. Push this repository to GitHub.
2. Sign up at [Render.com](https://render.com) and create a **New Web Service**.
3. Select your repository.
4. Set **Root Directory** to `backend`.
5. Set **Build Command**: `pip install -r requirements.txt`
6. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add Environment Variables:
   - `GROQ_API_KEY`: Your Groq API key
   - `DATABASE_URL`: `sqlite:///./sih2026.db` (or attach a free PostgreSQL on Render)
   - `JWT_SECRET_KEY`: Generate a random 32-char string
   - `CORS_ORIGINS`: Your Vercel frontend URL
8. Click **Deploy**.

### 2. Frontend on Vercel
1. Sign up at [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Vite**.
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-app.onrender.com`
6. Click **Deploy**.

---

## 📂 Project Architecture

```
SIH2026-Code/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, static mounts, router registry
│   │   ├── config.py            # Pydantic Settings & environment variables
│   │   ├── database.py          # SQLite / PostgreSQL engine & session factory
│   │   ├── models.py            # SQLAlchemy ORM (Users, Scans, Violations, Products)
│   │   ├── schemas.py           # Pydantic v2 schemas for requests and responses
│   │   ├── auth.py              # JWT tokens & bcrypt password hashing
│   │   ├── dependencies.py      # Auth guards & role-based access control
│   │   ├── ocr_engine.py        # OpenCV CLAHE + PaddleOCR text & bbox extraction
│   │   ├── llm_extractor.py     # Groq API LLaMA 3.1 70B JSON entity parser
│   │   ├── rule_engine.py       # 9 Legal Metrology Rule 6 validation functions
│   │   ├── pdf_generator.py     # ReportLab 3-page statutory audit report generator
│   │   └── routers/
│   │       ├── scan.py          # POST /api/v1/scan, GET /scan/{id}/report
│   │       ├── products.py      # GET /api/v1/products catalog
│   │       ├── analytics.py     # GET /api/v1/analytics/dashboard metrics
│   │       └── auth.py          # POST /api/v1/auth/login, /register
│   ├── uploads/                 # Storage for scanned packaging images
│   ├── reports/                 # Storage for generated PDF audit reports
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Backend environment template
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Global navigation bar & officer profile
│   │   │   ├── CameraCapture.jsx    # Live camera viewfinder & file upload
│   │   │   ├── ComplianceCard.jsx   # Circular score gauge & quick metrics
│   │   │   ├── DeclarationsTable.jsx# 9 Legal Metrology declarations table
│   │   │   └── ViolationList.jsx    # Severity-ranked non-compliance cards
│   │   ├── pages/
│   │   │   ├── Scanner.jsx      # Public scanning view
│   │   │   ├── Result.jsx       # Comprehensive compliance scan result
│   │   │   ├── Dashboard.jsx    # Inspector analytics & charts
│   │   │   └── Login.jsx        # Inspector login & registration
│   │   ├── App.jsx              # Router & ProtectedRoute wrappers
│   │   ├── main.jsx             # React DOM root entry
│   │   └── index.css            # Tailwind CSS base & utilities
│   ├── index.html               # Web HTML entry
│   ├── vite.config.js           # Vite dev proxy configuration
│   ├── tailwind.config.js       # Tailwind CSS theme configuration
│   ├── package.json             # NPM dependencies & scripts
│   ├── .env.example             # Frontend environment template
│   └── README.md
│
├── .gitignore                   # Root gitignore
└── README.md                    # This documentation
```

---

## 👥 Team: 404 The Optimists
- **Smart India Hackathon 2026**
- **Domain:** Legal Metrology, Consumer Affairs & E-Commerce Compliance
