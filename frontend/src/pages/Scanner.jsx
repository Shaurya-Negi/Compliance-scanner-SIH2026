import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../components/CameraCapture';
import api from '../api/client';

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleProcessImage = async (file) => {
    setIsScanning(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/api/v1/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.scan_id) {
        navigate(`/result/${response.data.scan_id}`);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(
        err.response?.data?.detail || 'Scan processing failed. Please ensure the backend is running and try again.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium">
          <span>AI-Powered Legal Metrology Rules 2011 Verification</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          Packaged Commodity Scanner
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Instant 3-second validation of 9 mandatory declarations under Rule 6 including font sizes, MRP, manufacturing dates, and manufacturer address.
        </p>
      </div>

      {error && (
        <div className="mb-6 max-w-xl mx-auto p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">Analysis Failed</p>
            <p className="text-xs text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Viewfinder Component */}
      <CameraCapture
        onCapture={handleProcessImage}
        onFileSelect={handleProcessImage}
        isScanning={isScanning}
      />

      {/* 9 Declarations Checklist Reference */}
      <div className="mt-16 bg-slate-950/60 border border-slate-800/80 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          9 Mandatory Declarations Validated (Rule 6)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>1. Common Name of Commodity</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>2. Net Quantity & Font Height</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>3. MRP (incl. of all taxes)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>4. Manufacturing/Packing Date</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>5. Complete Address with PIN</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>6. Customer Care (Phone & Email)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>7. Country of Origin</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>8. Unit Sale Price</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            <span>9. Best Before / Expiry Date</span>
          </div>
        </div>
      </div>
    </div>
  );
}
