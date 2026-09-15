import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CameraCapture from '../components/CameraCapture';
import api from '../api/client';

const PIPELINE_STAGES = [
  { id: 1, name: 'Computer Vision & Area Calibration', desc: 'OpenCV packaging contour analysis & PDP area (cm²) calculation' },
  { id: 2, name: 'GS1 Ground Truth & Multi-Pass Barcode', desc: 'Cross-reference against locked GS1 India product catalog' },
  { id: 3, name: 'High-Accuracy Multilingual OCR', desc: 'RapidOCR/PaddleOCR deep neural detection across all packaging surfaces' },
  { id: 4, name: 'Groq LLaMA 3.1 70B Semantic Parsing', desc: 'Extraction & classification of all 9 mandatory declarations' },
  { id: 5, name: 'Legal Metrology Rules 2011 Validation', desc: 'Rule 6 statutory checks + Schedule II font size validation' }
];

export default function Scanner() {
  // Step workflow state: 1 = Barcode Scan & Lock, 2 = Full Label Photo & Verify
  const [currentStep, setCurrentStep] = useState(1);
  const [barcodeMode, setBarcodeMode] = useState('camera'); // 'camera' | 'input' | 'presets'

  // Barcode & Product Identity state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lockedProduct, setLockedProduct] = useState(null);
  const [isDecodingBarcode, setIsDecodingBarcode] = useState(false);

  // Multi-Surface Staged Photos State
  const [stagedImages, setStagedImages] = useState([]);

  // Full Label & Pipeline state
  const [isScanning, setIsScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [error, setError] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const navigate = useNavigate();

  // Load sample packs on mount
  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    setLoadingSamples(true);
    try {
      const res = await api.get('/api/v1/scan/samples');
      setSamples(res.data || []);
    } catch (e) {
      console.warn('Failed to load sample packs from backend:', e);
    } finally {
      setLoadingSamples(false);
    }
  };

  // Helper to run pipeline stage animations during scan
  const startPipelineAnimation = () => {
    setCurrentStage(1);
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, 600);
    return interval;
  };

  // ==========================================
  // STEP 1: BARCODE SCANNING & RESOLUTION
  // ==========================================

  // 1A. Optical Barcode Decoding from Camera / Image File
  const handleBarcodeImageCapture = async (file) => {
    setIsDecodingBarcode(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/api/v1/scan/decode-barcode-image', formData);

      if (res.data && res.data.success && res.data.product) {
        setLockedProduct(res.data.product);
        setBarcodeInput(res.data.product.barcode || '');
      } else {
        setError(
          res.data?.message || 'No clear barcode detected in the image. Try aligning the barcode closer or enter the 13 digits manually.'
        );
      }
    } catch (err) {
      console.error('Barcode decoding error:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (err.message || 'Failed to decode barcode from image. Please try again or enter the barcode number.'));
      setError(errorMsg);
    } finally {
      setIsDecodingBarcode(false);
    }
  };

  // 1B. Direct GTIN-13 Barcode Lookup by Number
  const handleManualBarcodeLookup = async (codeToLookup) => {
    const code = (codeToLookup || barcodeInput).trim();
    if (!code) return;

    setIsDecodingBarcode(true);
    setError(null);

    try {
      const res = await api.post('/api/v1/scan/resolve-barcode', {
        barcode: code,
      });

      if (res.data && res.data.success && res.data.product) {
        setLockedProduct(res.data.product);
        setBarcodeInput(res.data.product.barcode || code);
      } else {
        setError(
          res.data?.message || `Barcode "${code}" was not found in GS1 India or OpenFoodFacts database.`
        );
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (err.message === 'Network Error' ? 'Cannot connect to backend server. Please ensure the backend is running (or wait a few seconds if Render is waking up).' : (err.message || `Failed to resolve barcode "${code}".`)));
      setError(errorMsg);
    } finally {
      setIsDecodingBarcode(false);
    }
  };

  // 1C. Select Sample Preset
  const handleSelectSamplePreset = (sample) => {
    setLockedProduct({
      barcode: sample.ean,
      product_name: sample.title,
      brand: sample.brand,
      category: sample.category,
      net_quantity: sample.expected_status === 'Compliant' ? 'Standard Pack' : 'Non-compliant declaration',
      mrp_approx: 'Verified Market MRP',
      manufacturer: `${sample.brand} Consumer Products India`,
      source: 'GS1_India_Catalog',
      is_indian_gs1: true,
      sample_id: sample.id,
      sample_image_url: sample.image_url,
    });
    setBarcodeInput(sample.ean);
    setError(null);
  };

  const handleResetBarcode = () => {
    setLockedProduct(null);
    setBarcodeInput('');
    setCurrentStep(1);
    handleClearAllStaged();
    setError(null);
  };

  // ==========================================
  // STEP 2: MULTI-SURFACE STAGING & VALIDATION
  // ==========================================

  // Add photos to the multi-angle staging tray
  const handleStagePhoto = (fileOrFiles, keepOpen = false) => {
    setError(null);
    const filesArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];

    const newItems = filesArray.map((file, idx) => ({
      id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name || `Surface_${stagedImages.length + idx + 1}.jpg`,
      size: `${(file.size / 1024).toFixed(0)} KB`
    }));

    setStagedImages((prev) => [...prev, ...newItems]);
  };

  const handleRemoveStagedImage = (idToRemove) => {
    setStagedImages((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  };

  const handleClearAllStaged = () => {
    stagedImages.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setStagedImages([]);
  };

  // Execute unified scan on all staged photos (or fallback to a single file if provided directly)
  const handleExecuteMultiSurfaceScan = async (directFile = null) => {
    const imagesToScan = directFile ? [{ file: directFile }] : stagedImages;

    if (!imagesToScan || imagesToScan.length === 0) {
      setError('Please capture or upload at least one packaging label photo before scanning.');
      return;
    }

    setIsScanning(true);
    setError(null);
    const animInterval = startPipelineAnimation();

    const formData = new FormData();

    // If single image, send as 'image'; if multiple images, send each under 'images'
    if (imagesToScan.length === 1) {
      formData.append('image', imagesToScan[0].file);
    } else {
      imagesToScan.forEach((item) => {
        formData.append('images', item.file);
      });
    }

    if (lockedProduct?.barcode) {
      formData.append('barcode', lockedProduct.barcode);
    }

    try {
      const response = await api.post('/api/v1/scan', formData);

      if (response.data && response.data.scan_id) {
        navigate(`/result/${response.data.scan_id}`);
      }
    } catch (err) {
      console.error('Scan error:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (err.message === 'Network Error' ? 'Network Error: Cannot connect to the compliance backend. Please verify backend is running.' : (err.message || 'Scan processing failed. Please ensure the backend is running and try again.')));
      setError(errorMsg);
    } finally {
      clearInterval(animInterval);
      setIsScanning(false);
    }
  };

  // Quick 1-Click Test on pre-loaded sample
  const handleRunSampleQuickTest = async (sampleId) => {
    setIsScanning(true);
    setError(null);
    const animInterval = startPipelineAnimation();

    try {
      const response = await api.post(`/api/v1/scan/quick-test/${sampleId}`);
      if (response.data && response.data.scan_id) {
        navigate(`/result/${response.data.scan_id}`);
      }
    } catch (err) {
      console.error('Sample test error:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (err.message === 'Network Error' ? 'Network Error: Backend unreachable. Please verify server status.' : (err.message || 'Failed to process sample package test.')));
      setError(errorMsg);
    } finally {
      clearInterval(animInterval);
      setIsScanning(false);
    }
  };

  const getSampleImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}${url}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 relative">
      {/* Header Banner */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          <span>Legal Metrology (Packaged Commodities) Rules, 2011 Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          AI Compliance Scanner
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          2-Step Guided Verification: First lock the product barcode, then capture one or multiple packaging angles (front, MRP sticker, manufacturer panel) for comprehensive Rule 6 validation.
        </p>
      </div>

      {/* Guided 2-Step Sequential Stepper Indicator */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
          {/* STEP 1 TAB BUTTON */}
          <button
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-xl text-left transition flex items-center space-x-3 cursor-pointer ${
              currentStep === 1
                ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/50 shadow-md'
                : lockedProduct
                ? 'bg-slate-950/60 border border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950/40 border border-transparent text-slate-400'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                lockedProduct
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : currentStep === 1
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {lockedProduct ? '✓' : '1'}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold ${currentStep === 1 ? 'text-cyan-300' : lockedProduct ? 'text-emerald-300' : 'text-slate-400'}`}>
                STEP 1: Barcode Scan
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {lockedProduct ? `${lockedProduct.brand} (Locked)` : 'Identify GS1 Product'}
              </p>
            </div>
          </button>

          {/* STEP 2 TAB BUTTON */}
          <button
            onClick={() => {
              if (lockedProduct) setCurrentStep(2);
            }}
            disabled={!lockedProduct}
            className={`p-3 rounded-xl text-left transition flex items-center space-x-3 ${
              !lockedProduct
                ? 'opacity-50 cursor-not-allowed bg-slate-950/20 border border-transparent text-slate-600'
                : currentStep === 2
                ? 'bg-gradient-to-r from-teal-950/80 to-emerald-950/80 border border-teal-500/50 shadow-md cursor-pointer'
                : 'bg-slate-950/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-teal-500/40'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                currentStep === 2
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-400'
                  : lockedProduct
                  ? 'bg-slate-800 text-teal-400 border border-teal-500/30'
                  : 'bg-slate-900 text-slate-700'
              }`}
            >
              2
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold ${currentStep === 2 ? 'text-teal-300' : 'text-slate-400'}`}>
                STEP 2: Packaging Photos
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {stagedImages.length > 0
                  ? `${stagedImages.length} Surface${stagedImages.length > 1 ? 's' : ''} Staged`
                  : lockedProduct
                  ? 'Ready to Capture & Verify'
                  : 'Requires Step 1 Lock'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="mb-6 max-w-2xl mx-auto p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start space-x-3 shadow-xl">
          <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-grow">
            <p className="font-semibold text-red-300">Scanner Notice</p>
            <p className="text-xs text-red-200 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1 VIEW: SCAN & LOCK BARCODE IDENTITY                                 */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* If Product is Already Locked in Step 1, Show the GS1 Identity Card */}
          {lockedProduct ? (
            <div className="max-w-2xl mx-auto bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg">
                    🛡️
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      GS1 Product Identity Locked
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-100 mt-0.5">
                      {lockedProduct.product_name}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={handleResetBarcode}
                  className="text-xs text-slate-400 hover:text-amber-400 underline font-medium transition cursor-pointer"
                >
                  Change Barcode
                </button>
              </div>

              {/* Product Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Brand</span>
                  <span className="text-slate-200 font-bold text-sm mt-0.5 block truncate">{lockedProduct.brand}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">GTIN-13 Barcode</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs mt-0.5 block truncate">{lockedProduct.barcode}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                  <span className="text-slate-200 font-medium text-xs mt-0.5 block truncate">{lockedProduct.category || 'Commodity'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Declared Net Qty</span>
                  <span className="text-slate-200 font-medium text-xs mt-0.5 block truncate">{lockedProduct.net_quantity || 'Standard Pack'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Approx MRP</span>
                  <span className="text-slate-200 font-medium text-xs mt-0.5 block truncate">{lockedProduct.mrp_approx || '₹--'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Manufacturer</span>
                  <span className="text-slate-200 font-medium text-xs mt-0.5 block truncate">{lockedProduct.manufacturer || 'Registered FMCG Maker'}</span>
                </div>
              </div>

              {/* Action Buttons to Proceed to Step 2 */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-teal-950/60 transition transform active:scale-[0.99] flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer"
                >
                  <span>Proceed to Step 2: Capture Packaging Photos</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    to={`/barcode/${lockedProduct.barcode}`}
                    className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 border border-teal-500/30 hover:border-teal-500/60 text-teal-300 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
                  >
                    <span>🔢</span>
                    <span>Inspect in Barcode Browser Registry</span>
                  </Link>

                  {lockedProduct.sample_id && (
                    <button
                      onClick={() => handleRunSampleQuickTest(lockedProduct.sample_id)}
                      disabled={isScanning}
                      className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 border border-teal-500/30 hover:border-teal-500/60 text-teal-300 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>1-Click Test Label Verification</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Barcode Selection Sub-Interface */
            <div className="space-y-6">
              {/* Sub-Tabs for Step 1 */}
              <div className="flex justify-center">
                <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-xl flex items-center space-x-1 shadow-lg">
                  <button
                    onClick={() => setBarcodeMode('camera')}
                    className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 cursor-pointer ${
                      barcodeMode === 'camera'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span>Barcode Camera / Upload</span>
                  </button>

                  <button
                    onClick={() => setBarcodeMode('input')}
                    className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 cursor-pointer ${
                      barcodeMode === 'input'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span>Enter GTIN-13 Digits</span>
                  </button>

                  <button
                    onClick={() => setBarcodeMode('presets')}
                    className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 cursor-pointer ${
                      barcodeMode === 'presets'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span>FMCG Test Suite</span>
                  </button>
                </div>
              </div>

              {/* 1A: Optical Camera Viewfinder */}
              {barcodeMode === 'camera' && (
                <div className="space-y-4">
                  <CameraCapture
                    mode="barcode"
                    onCapture={handleBarcodeImageCapture}
                    onFileSelect={handleBarcodeImageCapture}
                    isScanning={isDecodingBarcode}
                    instruction="Align the product barcode (EAN-13 / QR) inside the horizontal laser guide"
                    buttonText={isDecodingBarcode ? 'Decoding Barcode...' : 'Capture & Identify Barcode'}
                    badgeText="STEP 1 • OPTICAL BARCODE SCANNER"
                  />
                  {isDecodingBarcode && (
                    <div className="text-center text-xs text-cyan-300 font-mono animate-pulse flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
                      <span>Analyzing packaging with zxing-cpp + pyzbar + GS1 India...</span>
                    </div>
                  )}
                </div>
              )}

              {/* 1B: Manual 13-digit GTIN Entry */}
              {barcodeMode === 'input' && (
                <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-100">GS1 India 13-Digit Barcode / GTIN Lookup</h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Enter the 13-digit EAN code printed under the barcode bars to instantly resolve the authentic commodity identity.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleManualBarcodeLookup();
                    }}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter 13-digit barcode (e.g., 8901719101014)"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={isDecodingBarcode || !barcodeInput.trim()}
                        className="absolute right-2 top-2 bottom-2 px-5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        {isDecodingBarcode ? (
                          <span>Resolving...</span>
                        ) : (
                          <span>Resolve & Lock</span>
                        )}
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick FMCG Presets:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Parle-G (8901719101014)', code: '8901719101014' },
                          { label: 'Maggi Noodles (8901058852467)', code: '8901058852467' },
                          { label: 'Tata Salt (8901030383149)', code: '8901030383149' },
                          { label: 'Amul Butter (8901262010054)', code: '8901262010054' },
                          { label: 'Dettol Soap (8901396010013)', code: '8901396010013' }
                        ].map((preset) => (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => {
                              setBarcodeInput(preset.code);
                              handleManualBarcodeLookup(preset.code);
                            }}
                            className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-xs font-mono text-slate-300 transition cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* 1C: FMCG Test Suite Presets */}
              {barcodeMode === 'presets' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-base font-bold text-slate-200">
                      Select FMCG Product to Lock Barcode
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any product below to lock its authentic GS1 identity and proceed to Step 2.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {samples.map((s) => {
                      const isPassing = s.expected_status === 'Compliant';
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSamplePreset(s)}
                          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 flex flex-col justify-between transition group shadow-lg cursor-pointer hover:bg-slate-850"
                        >
                          <div className="space-y-3">
                            <div className="relative aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                              <img
                                src={getSampleImageUrl(s.image_url)}
                                alt={s.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <span
                                className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isPassing
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                                }`}
                              >
                                {s.expected_status}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-semibold text-cyan-400">{s.brand}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-[11px] font-mono text-slate-400">EAN: {s.ean}</span>
                              </div>
                              <h3 className="text-sm font-bold text-slate-200 mt-0.5">{s.title}</h3>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                            <span>Lock This Barcode</span>
                            <span>→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2 VIEW: CAPTURE PACKAGING PHOTOS & RUN MULTI-SURFACE VALIDATION      */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Top Sticky Locked Product Banner */}
          <div className="max-w-3xl mx-auto bg-slate-900 border border-teal-500/40 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-sm">
                🛡️
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-teal-400 uppercase bg-teal-950 px-2 py-0.5 rounded border border-teal-800/60">
                    Step 1 Ground Truth
                  </span>
                  <span className="text-xs text-cyan-300 font-mono font-bold">
                    EAN: {lockedProduct?.barcode}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  {lockedProduct?.product_name || 'Verified Commodity'}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-400 hover:text-slate-200 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 transition cursor-pointer"
              >
                ← Edit Barcode
              </button>
            </div>
          </div>

          {/* Staged Multi-Surface Photos Tray (Visible when photos are added) */}
          {stagedImages.length > 0 && (
            <div className="max-w-3xl mx-auto bg-slate-900/90 border-2 border-teal-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping"></span>
                  <h3 className="text-sm sm:text-base font-bold text-teal-200 flex items-center space-x-2">
                    <span>Staged Packaging Surfaces</span>
                    <span className="bg-teal-950 text-teal-400 text-xs px-2.5 py-0.5 rounded-full border border-teal-500/40">
                      {stagedImages.length} Angle{stagedImages.length > 1 ? 's' : ''} Ready
                    </span>
                  </h3>
                </div>

                <button
                  onClick={handleClearAllStaged}
                  className="text-xs text-slate-400 hover:text-red-400 transition font-medium cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="p-3 bg-teal-950/30 border border-teal-800/40 rounded-xl text-xs text-teal-300/90 flex items-start space-x-2.5">
                <span className="text-sm">💡</span>
                <p>
                  <strong>Multi-angle inspection active:</strong> All staged photos will be processed in a unified OCR pipeline. Text from cylindrical curved surfaces or separate stickers (MRP, Expiry, Address, Ingredients) will be combined to validate all 9 Legal Metrology declarations.
                </p>
              </div>

              {/* Thumbnails Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stagedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-md flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                      <img
                        src={img.previewUrl}
                        alt={`Surface ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-slate-900/90 text-teal-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-teal-500/30">
                        #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveStagedImage(img.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-900/90 text-red-200 hover:bg-red-700 flex items-center justify-center text-xs shadow transition cursor-pointer"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-2 text-[11px] text-slate-400 bg-slate-900/80 flex items-center justify-between">
                      <span className="truncate max-w-[100px]">{img.name}</span>
                      <span className="text-slate-500 text-[10px]">{img.size}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons in Staging Tray */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleExecuteMultiSurfaceScan()}
                  disabled={isScanning}
                  className="flex-1 py-3.5 sm:py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-extrabold rounded-2xl shadow-xl shadow-teal-950/80 transition transform active:scale-[0.99] flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Run AI Compliance Scan on {stagedImages.length} Surface{stagedImages.length > 1 ? 's' : ''}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Full Packaging Label Camera Capture & Upload (Allows Continuous Staging) */}
          <CameraCapture
            mode="label"
            onCapture={handleStagePhoto}
            onFileSelect={handleStagePhoto}
            isScanning={isScanning}
            instruction="Snap photos of all package angles (Front, MRP/Date sticker, Address, Ingredients). Rotate cylindrical containers and click 'Snap Photo / Angle'."
            buttonText={isScanning ? 'Processing...' : 'Snap Angle / Surface'}
            badgeText="STEP 2 • PACKAGING SURFACE SCANNER"
            allowMultiple={true}
            stagedCount={stagedImages.length}
          />

          {/* Quick Option: Use Pre-loaded Sample Pack Label if available */}
          {lockedProduct?.sample_id && (
            <div className="max-w-xl mx-auto text-center pt-2">
              <button
                onClick={() => handleRunSampleQuickTest(lockedProduct.sample_id)}
                disabled={isScanning}
                className="inline-flex items-center space-x-2 text-xs text-teal-400 hover:text-teal-300 bg-teal-950/40 hover:bg-teal-950/80 px-4 py-2 rounded-xl border border-teal-500/30 transition cursor-pointer"
              >
                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Or use standard verified packaging test label for {lockedProduct.brand}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5-STAGE LIVE AI PIPELINE TRACKER MODAL OVERLAY                            */}
      {/* ========================================================================= */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <div className="w-6 h-6 border-3 border-teal-500/30 border-t-teal-400 rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Executing AI Compliance Pipeline
                </h3>
                <p className="text-xs text-slate-400">
                  {stagedImages.length > 1
                    ? `Concatenating & analyzing ${stagedImages.length} packaging surfaces`
                    : 'Cross-referencing against Legal Metrology Rules, 2011 & GS1'}
                </p>
              </div>
            </div>

            {/* Pipeline Stage Tracker */}
            <div className="space-y-3">
              {PIPELINE_STAGES.map((stg) => {
                const isDone = currentStage > stg.id;
                const isCurrent = currentStage === stg.id;
                return (
                  <div
                    key={stg.id}
                    className={`p-3 rounded-xl border transition-all duration-300 flex items-center space-x-3.5 ${
                      isCurrent
                        ? 'bg-teal-950/40 border-teal-500/50 shadow-md shadow-teal-950/40'
                        : isDone
                        ? 'bg-slate-950/50 border-slate-800 text-slate-400'
                        : 'bg-slate-950/20 border-slate-900/60 opacity-50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isDone ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs">
                          ✓
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-teal-500/30 border border-teal-400 text-teal-300 flex items-center justify-center text-xs font-bold animate-pulse">
                          {stg.id}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center text-xs">
                          {stg.id}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-teal-300' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                        {stg.name}
                      </p>
                      <p className="text-[11px] text-slate-500">{stg.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
