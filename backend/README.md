# SIH26034 Compliance Scanner — Backend API

FastAPI backend for automated packaged commodity compliance analysis against **Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## Features

- **3-Second AI Compliance Pipeline**:
  - Image Preprocessing (OpenCV CLAHE contrast enhancement)
  - OCR Text Extraction (PaddleOCR with bounding boxes)
  - Entity Extraction (Groq LLaMA 3.1 70B in JSON mode)
  - Rule Validation (All 9 mandatory declarations + Second Schedule font sizing)
  - Automated PDF Audit Report Generation (ReportLab)
- **Role-Based Access Control**: Consumer, Inspector, Admin
- **Inspector Analytics Dashboard**: Aggregates, top violations breakdown, compliance trends
- **Product Catalog**: Deduplicated scanned commodities repository

---

## Setup & Running Locally

### 1. Prerequisites
- Python 3.8 or higher
- Groq API Key (get free key at [console.groq.com](https://console.groq.com))

### 2. Installation
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Edit `.env` and fill in your `GROQ_API_KEY`:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
DATABASE_URL=sqlite:///./sih2026.db
JWT_SECRET_KEY=your-super-secret-key-for-jwt-signing
```

### 4. Start the Server
```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Documentation (Swagger)**: http://127.0.0.1:8000/docs
- **Alternative Documentation (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

---

## API Endpoints

### Scanning
- `POST /api/v1/scan` — Upload packaging image, returns compliance score & violations
- `GET /api/v1/scan/{id}` — Get specific scan results
- `GET /api/v1/scan/{id}/report` — Download PDF audit report
- `GET /api/v1/scans/recent` — Get list of recent scans

### Analytics
- `GET /api/v1/analytics/dashboard` — Inspector analytics (total scans, avg score, top violations)

### Products
- `GET /api/v1/products` — List catalogued products with search & score filters
- `GET /api/v1/products/{id}` — Get product details
- `GET /api/v1/products/{id}/scans` — Product scan history

### Authentication
- `POST /api/v1/auth/register` — Create user account
- `POST /api/v1/auth/login` — Login and receive JWT bearer token
- `GET /api/v1/auth/me` — Get current user profile
