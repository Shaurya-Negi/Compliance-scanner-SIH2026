# SIH26034 AI Compliance Scanner — Frontend

Modern React 18 + Vite + Tailwind CSS frontend interface for **Smart India Hackathon 2026 Problem Statement SIH26034** (AI-Powered Packaged Commodity Compliance System under Legal Metrology Rules, 2011).

## Features

- 📸 **Mobile-First Camera Viewfinder**: Real-time live camera capture via `navigator.mediaDevices` with packaging alignment guides and image file upload fallback.
- ⚡ **Instant Compliance Feedback**: 3-second visual feedback gauge showing compliance percentage and statutory status.
- 📋 **9 Mandatory Declarations Matrix**: Comprehensive checklist breakdown of Rule 6 compliance with font size analysis.
- ⚠️ **Severity-Ranked Violations**: Color-coded violation badges (Critical, Major, Minor) with legal clause references.
- 📄 **PDF Audit Report Downloads**: One-click download of official 3-page Legal Metrology inspection reports.
- 📊 **Inspector Dashboard**: Protected route with Recharts visualization for violation trends and commodity compliance history.
- 🔐 **JWT Authentication**: Role-based access control (Consumer, Inspector, Administrator).

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default settings:
```env
VITE_API_BASE_URL=http://localhost:8000
```

*Note: In local development, the Vite dev server also automatically proxies `/api`, `/uploads`, and `/reports` directly to `http://localhost:8000`.*

### 3. Run Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
```

The optimized static production bundle will be created in the `dist/` directory, ready for zero-config deployment to Vercel, Netlify, or AWS S3.

## Deployment to Vercel (Free Tier)

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Set Environment Variable:
   - `VITE_API_BASE_URL`: Your deployed Render backend URL (e.g. `https://sih26034-backend.onrender.com`).
5. Click **Deploy**.
