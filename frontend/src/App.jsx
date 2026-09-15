import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Scanner from './pages/Scanner';
import Result from './pages/Result';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import BarcodeLookup from './pages/BarcodeLookup';

// Protected route wrapper for Inspector dashboard
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('sih_access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Scanner />} />
            <Route path="/barcode" element={<BarcodeLookup />} />
            <Route path="/barcode/:barcode" element={<BarcodeLookup />} />
            <Route path="/result/:scanId" element={<Result />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
          <p>SIH26034 AI Packaged Commodity Compliance System • Team 404 The Optimists</p>
        </footer>
      </div>
    </Router>
  );
}
