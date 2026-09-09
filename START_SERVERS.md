# 🚀 SIH26034 — How to Start Both Servers

## ✅ Working Configuration (Port Issue Resolved)

### Issue Encountered
- **Port 8000**: Windows socket permission error (WinError 10013)
- **Port 8080**: Was occupied by background process

### ✅ Solution Applied
All hanging Python processes have been cleared. Port 8080 is now free and ready.

---

## 📋 Step-by-Step Startup Commands

### Terminal 1: Start Backend (FastAPI)

```powershell
cd C:\Users\negis\Desktop\SIH2026-Code\backend
python -m uvicorn app.main:app --host localhost --port 8080
```

**Expected Output:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
✓ Database initialized
✓ Upload directory: uploads
✓ Report directory: reports
🚀 API running on 0.0.0.0:8080
INFO:     Application startup complete.
```

**Backend URLs:**
- 🌐 API Root: http://localhost:8080
- 📄 Swagger Docs: http://localhost:8080/docs
- 🔍 Health Check: http://localhost:8080/health

---

### Terminal 2: Start Frontend (React + Vite)

```powershell
cd C:\Users\negis\Desktop\SIH2026-Code\frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.4.21  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Frontend URL:**
- 🎨 Web Application: http://localhost:5173

---

## 🔐 Demo Login Credentials

Once both servers are running, open http://localhost:5173 in your browser.

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Inspector** | inspector@sih.gov.in | demo2026 | Full dashboard, analytics, reports |
| **Public Consumer** | *(No login needed)* | - | Camera scanner, instant compliance check |

---

## 🛠️ Troubleshooting

### If you see "Address already in use" error:
```powershell
# Kill all Python processes and restart
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
```

Then restart the backend.

### If frontend cannot connect to backend:
1. Verify backend is running at http://localhost:8080
2. Check `frontend/.env` contains: `VITE_API_BASE_URL=http://localhost:8080`
3. Restart the frontend dev server

---

## 📂 Project Structure

```
C:\Users\negis\Desktop\SIH2026-Code\
├── backend\              ← FastAPI + SQLite
│   ├── app\
│   ├── uploads\          (created at runtime)
│   ├── reports\          (created at runtime)
│   └── sih2026.db        (SQLite database, created at first scan)
│
├── frontend\             ← React + Vite + Tailwind
│   ├── src\
│   ├── dist\             (production build output)
│   └── .env              (VITE_API_BASE_URL=http://localhost:8080)
│
└── README.md
```

---

## 🎯 Next Steps

1. ✅ Start both servers using the commands above
2. 🌐 Open http://localhost:5173 in your browser
3. 📸 Test the camera scanner (or upload a product label image)
4. 🔐 Login as inspector to view dashboard analytics
5. 📄 Download PDF compliance reports

---

**Status:** All port conflicts resolved ✅  
**Ready for hackathon demo!** 🏆
