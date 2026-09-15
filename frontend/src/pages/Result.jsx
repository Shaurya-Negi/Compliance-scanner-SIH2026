import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import ComplianceCard from '../components/ComplianceCard';
import MultiFactorVerificationCard from '../components/MultiFactorVerificationCard';
import ViolationList from '../components/ViolationList';
import DeclarationsTable from '../components/DeclarationsTable';

export default function Result() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
      setActiveImageIndex(0);
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

  // Determine images list (multi-surface or single primary)
  const imageList = scanData?.image_urls && scanData.image_urls.length > 0
    ? scanData.image_urls
    : scanData?.image_url
    ? [scanData.image_url]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <button
            onClick={() => navigate('/')}
            className="hover:text-teal-400 transition cursor-pointer"
          >
            Scanner
          </button>
          <span>/</span>
          <span className="text-slate-300 font-medium">Scan Result #{scanId}</span>
        </div>

        {scanData?.barcode && (
          <div className="flex items-center space-x-2 bg-slate-900 border border-cyan-500/40 px-3 py-1 rounded-full text-xs">
            <span className="text-slate-400">GS1 EAN:</span>
            <span className="font-mono text-cyan-300 font-bold">{scanData.barcode}</span>
          </div>
        )}
      </div>

      {/* Multi-Surface Packaging Image Gallery */}
      {imageList.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📸</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-200">
                Packaging Surface Photos ({imageList.length} Angle{imageList.length > 1 ? 's' : ''} Analyzed)
              </h3>
            </div>
            {imageList.length > 1 && (
              <span className="text-xs text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-800/60 font-semibold">
                Surface #{activeImageIndex + 1} of {imageList.length}
              </span>
            )}
          </div>

          {/* Main Selected Image View */}
          <div className="flex justify-center bg-slate-950 rounded-2xl p-4 border border-slate-800/80">
            <img
              src={getImageUrl(imageList[activeImageIndex])}
              alt={`Packaging Surface ${activeImageIndex + 1}`}
              className="max-h-96 object-contain rounded-xl shadow-2xl"
            />
          </div>

          {/* Thumbnail Carousel for Multi-Angle Photos */}
          {imageList.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pt-2 pb-1">
              {imageList.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative flex-shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-teal-400 scale-105 shadow-lg shadow-teal-950/60'
                      : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={getImageUrl(url)}
                    alt={`Surface ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-slate-900/90 text-teal-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compliance Score Card */}
      <ComplianceCard
        scanData={scanData}
        onDownloadPdf={handleDownloadPdf}
        isDownloading={isDownloading}
      />

      {/* Multi-Factor Verification & 3-Way Cross-Analysis */}
      {scanData?.multi_factor_verification && (
        <MultiFactorVerificationCard
          verificationData={scanData.multi_factor_verification}
        />
      )}

      {/* 9 Declarations Validation Table */}
      <DeclarationsTable
        ruleChecks={scanData?.checks || scanData?.rule_checks || []}
        extractedEntities={scanData?.entities || scanData?.extracted_entities || {}}
      />

      {/* Violations List */}
      <ViolationList violations={scanData?.violations || []} />

      {/* Raw OCR Text (Collapsible) */}
      {(scanData?.raw_ocr_text || scanData?.entities?.raw_text) && (
        <details className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <summary className="text-sm font-bold text-slate-300 cursor-pointer uppercase tracking-wider hover:text-teal-400 transition">
            View Aggregated Multi-Surface OCR Output
          </summary>
          <pre className="mt-4 text-xs text-slate-400 font-mono bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
            {scanData.raw_ocr_text || scanData.entities?.raw_text}
          </pre>
        </details>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition flex items-center space-x-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Scan Another Product</span>
        </button>

        <div className="text-xs text-slate-500">
          <span>AI Legal Metrology Compliance Engine • RapidOCR + Groq LLaMA 3.1 70B</span>
        </div>
      </div>
    </div>
  );
}
