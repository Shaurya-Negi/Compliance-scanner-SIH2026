import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import ComplianceCard from '../components/ComplianceCard';
import ViolationList from '../components/ViolationList';
import DeclarationsTable from '../components/DeclarationsTable';

export default function Result() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}${url}`;
  };

  useEffect(() => {
    fetchScanResult();
  }, [scanId]);

  const fetchScanResult = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/v1/scan/${scanId}`);
      setScanData(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(
        err.response?.data?.detail || 'Failed to load scan results. The scan may not exist or the backend is unavailable.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/api/v1/scan/${scanId}/report`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SIH26034_Compliance_Report_${scanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('PDF generation failed. The backend may not have ReportLab configured properly.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-6"></div>
        <p className="text-slate-300 text-lg font-medium">Loading Compliance Analysis Results...</p>
        <p className="text-slate-500 text-sm mt-2">Processing scan #{scanId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-red-950/30 border border-red-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-300 mb-2">Failed to Load Scan Results</h2>
          <p className="text-sm text-red-200 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition"
          >
            Return to Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <button
          onClick={() => navigate('/')}
          className="hover:text-teal-400 transition"
        >
          Scanner
        </button>
        <span>/</span>
        <span className="text-slate-300 font-medium">Scan Result #{scanId}</span>
      </div>

      {/* Product Image Thumbnail */}
      {scanData?.image_url && (
        <div className="flex justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 inline-block">
            <img
              src={getImageUrl(scanData.image_url)}
              alt="Scanned product label"
              className="max-w-full max-h-80 rounded-lg shadow-lg"
            />
            <p className="text-center text-xs text-slate-400 mt-3">
              Original Label Image
            </p>
          </div>
        </div>
      )}

      {/* Compliance Score Card */}
      <ComplianceCard
        scanData={scanData}
        onDownloadPdf={handleDownloadPdf}
        isDownloading={isDownloading}
      />

      {/* 9 Declarations Validation Table */}
      <DeclarationsTable
        ruleChecks={scanData?.checks || scanData?.rule_checks || []}
        extractedEntities={scanData?.entities || scanData?.extracted_entities || {}}
      />

      {/* Violations List */}
      <ViolationList violations={scanData?.violations || []} />

      {/* Raw OCR Text (Collapsible) */}
      {scanData?.raw_ocr_text && (
        <details className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <summary className="text-sm font-bold text-slate-300 cursor-pointer uppercase tracking-wider hover:text-teal-400 transition">
            View Raw OCR Output ({scanData.raw_ocr_text.length} characters)
          </summary>
          <pre className="mt-4 text-xs text-slate-400 font-mono bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
            {scanData.raw_ocr_text}
          </pre>
        </details>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Scan Another Product</span>
        </button>

        <div className="text-xs text-slate-500">
          <span>Powered by PaddleOCR + Groq AI LLaMA / Qwen</span>
        </div>
      </div>
    </div>
  );
}
