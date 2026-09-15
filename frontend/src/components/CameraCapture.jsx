import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function CameraCapture({
  mode = 'label', // 'barcode' | 'label'
  onCapture,
  onFileSelect,
  isScanning = false,
  instruction,
  buttonText,
  badgeText,
  allowMultiple = true,
  stagedCount = 0
}) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [snapFlash, setSnapFlash] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Attach stream to video whenever video element or stream updates
  const attachStreamToVideo = useCallback(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current
        .play()
        .then(() => {
          setCameraLoading(false);
        })
        .catch((err) => {
          console.warn('Video play caught:', err);
          setCameraLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      attachStreamToVideo();
    }
  }, [isCameraActive, attachStreamToVideo]);

  const startCamera = async (overrideFacing) => {
    const targetMode = overrideFacing || facingMode;
    setCameraError(null);
    setPreviewUrl(null);
    setCameraLoading(true);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      let stream;
      try {
        // High resolution constraints for crisp barcode & OCR text
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Ideal constraint failed, trying basic video constraints:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
        setCameraLoading(false);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(
        'Camera access denied or unavailable. Please grant browser camera permissions or upload an image file.'
      );
      setIsCameraActive(false);
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      await startCamera(nextMode);
    }
  };

  const captureFrame = (keepOpen = false) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Flip horizontally if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Flash animation effect for shutter feedback
    setSnapFlash(true);
    setTimeout(() => setSnapFlash(false), 200);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const filename = mode === 'barcode'
            ? `barcode_scan_${Date.now()}.jpg`
            : `label_surface_${Date.now()}.jpg`;
          const file = new File([blob], filename, {
            type: 'image/jpeg',
          });

          if (!keepOpen && mode === 'barcode') {
            stopCamera();
          }
          if (onCapture) {
            onCapture(file, keepOpen);
          }
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (mode === 'barcode') {
        const file = e.dataTransfer.files[0];
        setPreviewUrl(URL.createObjectURL(file));
        onFileSelect(file);
      } else {
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 1) {
          setPreviewUrl(URL.createObjectURL(files[0]));
        }
        onFileSelect(files.length === 1 ? files[0] : files);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (mode === 'barcode') {
        const file = e.target.files[0];
        setPreviewUrl(URL.createObjectURL(file));
        onFileSelect(file);
      } else {
        const files = Array.from(e.target.files);
        if (files.length === 1) {
          setPreviewUrl(URL.createObjectURL(files[0]));
        }
        onFileSelect(files.length === 1 ? files[0] : files);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const isBarcodeMode = mode === 'barcode';

  return (
    <div className="w-full">
      {/* Viewfinder / Interactive Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative w-full ${
          isBarcodeMode ? 'aspect-[16/9] sm:aspect-[2/1] max-h-[420px]' : 'aspect-[16/10] sm:aspect-[16/9] max-h-[500px]'
        } max-w-3xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 transition-all duration-300 flex flex-col items-center justify-center p-1 sm:p-2 ${
          dragOver
            ? 'border-teal-400 bg-teal-950/20 shadow-xl shadow-teal-500/20'
            : isCameraActive
            ? isBarcodeMode
              ? 'border-cyan-500/80 shadow-2xl shadow-cyan-950/60'
              : 'border-teal-500/80 shadow-2xl shadow-teal-950/60'
            : 'border-dashed border-slate-700 hover:border-slate-600'
        }`}
      >
        {isCameraActive ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-black">
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current) {
                  attachStreamToVideo();
                }
              }}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={attachStreamToVideo}
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {cameraLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-20">
                <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-teal-300 font-mono">Initializing Camera Optical Stream...</span>
              </div>
            )}

            {/* Shutter Snap Flash Effect */}
            {snapFlash && (
              <div className="absolute inset-0 bg-teal-200/40 backdrop-brightness-125 z-40 pointer-events-none animate-ping"></div>
            )}

            {/* Targeted Reticle & Alignment Guides */}
            {isBarcodeMode ? (
              // BARCODE TARGETING RETICLE (Narrow focused horizontal slot)
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3 sm:p-4 z-10">
                {/* Header Status Bar */}
                <div className="w-full flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs text-cyan-300 font-mono tracking-wider bg-slate-900/90 px-2.5 py-1 rounded-lg border border-cyan-500/30 flex items-center space-x-1.5 shadow">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>LIVE • {facingMode === 'environment' ? 'REAR CAM' : 'FRONT / WEBCAM'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300 font-mono bg-cyan-950/90 px-2.5 py-1 rounded-lg border border-cyan-500/40 uppercase">
                    {badgeText || 'STEP 1 • BARCODE OPTICAL DECODER'}
                  </span>
                </div>

                {/* Central Horizontal Barcode Frame */}
                <div className="relative w-[85%] sm:w-[70%] max-w-md h-24 sm:h-28 border-2 border-cyan-400 rounded-xl bg-cyan-950/20 backdrop-brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex flex-col justify-between p-2 overflow-hidden">
                  {/* Corner Accent Ticks */}
                  <div className="flex justify-between">
                    <div className="w-3 h-3 border-t-2 border-l-2 border-cyan-300"></div>
                    <div className="w-3 h-3 border-t-2 border-r-2 border-cyan-300"></div>
                  </div>

                  {/* High-Tech Animated Laser Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#22d3ee] animate-bounce my-auto"></div>

                  <div className="flex justify-between">
                    <div className="w-3 h-3 border-b-2 border-l-2 border-cyan-300"></div>
                    <div className="w-3 h-3 border-b-2 border-r-2 border-cyan-300"></div>
                  </div>
                </div>

                {/* Instruction Pill */}
                <div className="w-full text-center pb-12 sm:pb-14">
                  <span className="inline-block text-[11px] sm:text-xs font-semibold text-cyan-100 bg-slate-900/95 px-3 py-1 rounded-full border border-cyan-500/40 shadow-lg">
                    {instruction || 'Align packaging barcode (EAN-13 / GTIN) inside the laser box'}
                  </span>
                </div>
              </div>
            ) : (
              // FULL LABEL TARGETING RETICLE (Full package framing)
              <div className="absolute inset-2 sm:inset-5 border-2 border-teal-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-2.5 sm:p-3 z-10 shadow-[0_0_25px_rgba(20,184,166,0.2)]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] sm:text-xs text-teal-300 font-mono tracking-wider bg-slate-900/90 px-2.5 py-1 rounded-lg border border-teal-500/30 flex items-center space-x-1.5 shadow">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>LIVE • {facingMode === 'environment' ? 'REAR CAM' : 'FRONT / WEBCAM'}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    {stagedCount > 0 && (
                      <span className="text-[10px] font-bold text-amber-300 font-mono bg-amber-950/90 px-2.5 py-1 rounded-lg border border-amber-500/50 flex items-center space-x-1">
                        <span>📸</span>
                        <span>{stagedCount} ANGLE{stagedCount > 1 ? 'S' : ''} STAGED</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-teal-300 font-mono bg-teal-950/90 px-2.5 py-1 rounded-lg border border-teal-500/40 uppercase">
                      {badgeText || 'STEP 2 • PACKAGING SURFACE SCANNER'}
                    </span>
                  </div>
                </div>

                {/* Animated Laser Scanning Line */}
                <div className="relative w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_#2dd4bf] animate-bounce my-auto"></div>

                <div className="w-full text-center pb-12 sm:pb-14">
                  <span className="inline-block text-[11px] sm:text-xs font-semibold text-slate-100 bg-slate-900/95 px-3.5 py-1 rounded-full border border-teal-500/40 shadow-md">
                    {instruction || 'Position packaging surface (Front, MRP sticker, Address, etc.) in frame'}
                  </span>
                </div>
              </div>
            )}

            {/* Floating In-Viewfinder Action Controls */}
            <div className="absolute bottom-2.5 sm:bottom-3 inset-x-0 flex items-center justify-center gap-2 sm:gap-3 z-30 px-2 pointer-events-auto">
              <button
                onClick={() => captureFrame(isBarcodeMode ? false : true)}
                disabled={isScanning || cameraLoading}
                type="button"
                className={`px-5 sm:px-7 py-2.5 sm:py-3 font-bold rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center space-x-2 text-xs sm:text-sm disabled:opacity-50 cursor-pointer ${
                  isBarcodeMode
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-300/40 shadow-cyan-950/80'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white border border-teal-300/40 shadow-teal-950/80'
                }`}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
                <span>
                  {isBarcodeMode
                    ? buttonText || 'Capture Barcode'
                    : `Snap Photo / Angle ${stagedCount > 0 ? `(#${stagedCount + 1})` : ''}`}
                </span>
              </button>

              <button
                onClick={toggleCameraFacing}
                type="button"
                className="p-2.5 sm:px-3.5 sm:py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-medium rounded-xl border border-slate-700/80 backdrop-blur-md shadow-md transition text-xs flex items-center space-x-1 cursor-pointer"
                title="Switch camera"
              >
                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">Flip</span>
              </button>

              <button
                onClick={stopCamera}
                type="button"
                className="p-2.5 sm:px-3.5 sm:py-2.5 bg-slate-900/90 hover:bg-red-950/80 text-slate-300 hover:text-red-300 font-medium rounded-xl border border-slate-700/80 hover:border-red-800/80 backdrop-blur-md shadow-md transition text-xs cursor-pointer"
                title="Done / Close camera"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline">{!isBarcodeMode && stagedCount > 0 ? 'Done Snapping' : 'Close'}</span>
              </button>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center p-3">
            <img
              src={previewUrl}
              alt="Selected Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-800"
            />
            <div className="absolute bottom-4 bg-slate-900/95 text-slate-200 text-xs font-semibold px-4 py-1.5 rounded-full border border-slate-700 shadow-lg">
              {isBarcodeMode ? 'Selected Barcode Photo' : 'Selected Packaging Label'}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 px-4 py-6">
            <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border flex items-center justify-center mx-auto shadow-inner transition ${
              isBarcodeMode ? 'border-cyan-500/30 text-cyan-400' : 'border-teal-500/30 text-teal-400'
            }`}>
              {isBarcodeMode ? (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              ) : (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-base sm:text-lg">
                {isBarcodeMode
                  ? 'Scan Packaging Barcode via Camera or Upload Photo'
                  : 'Capture Full Packaging Label or Drop Image Here'}
              </p>
              <p className="text-slate-400 text-xs mt-1.5 max-w-md mx-auto">
                {isBarcodeMode
                  ? 'Position barcode under the camera lens or upload a clear close-up image to lock GS1 identity.'
                  : 'Ensure all 9 mandatory declarations (Net Quantity, MRP, Date, Address, etc.) are clearly visible.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="mt-3 max-w-md mx-auto p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs text-center flex items-center justify-center space-x-2">
          <svg
            className="w-4 h-4 text-amber-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{cameraError}</span>
        </div>
      )}

      {/* Action Buttons (When Camera is not active) */}
      {!isCameraActive && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 max-w-xl mx-auto">
          <button
            onClick={() => startCamera()}
            disabled={isScanning}
            className={`w-full sm:w-auto px-6 py-3.5 text-white font-semibold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-sm cursor-pointer ${
              isBarcodeMode
                ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/40'
                : 'bg-teal-600 hover:bg-teal-500 shadow-teal-950/40'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
            <span>{isBarcodeMode ? 'Open Barcode Camera Viewfinder' : 'Open Label Camera Viewfinder'}</span>
          </button>

          <label className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-700/80 cursor-pointer transition flex items-center justify-center space-x-2 text-sm shadow-md">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>{isBarcodeMode ? 'Browse Barcode Photo' : 'Browse Full Label Photos'}</span>
            <input
              type="file"
              accept="image/*"
              multiple={!isBarcodeMode}
              className="hidden"
              disabled={isScanning}
              onChange={handleFileInput}
            />
          </label>
        </div>
      )}
    </div>
  );
}
