import React, { useState, useRef, useEffect } from 'react';

export default function CameraCapture({ onCapture, onFileSelect, isScanning }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please use file upload below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        onCapture(file);
      }
    }, 'image/jpeg', 0.95);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full">
      {/* Camera Viewfinder or Placeholder */}
      <div className="relative w-full aspect-[4/3] max-w-xl mx-auto rounded-xl overflow-hidden bg-slate-950 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-4">
        {isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Target overlay */}
            <div className="absolute inset-8 border-2 border-teal-400/60 rounded-lg pointer-events-none flex flex-col justify-between p-2">
              <div className="text-[10px] text-teal-400 font-mono tracking-widest bg-slate-900/80 px-2 py-0.5 rounded self-start">
                ALIGN PACKAGING LABEL HERE
              </div>
              <div className="w-full text-center text-xs text-teal-300 bg-slate-900/80 py-1 rounded">
                Keep label flat and well-lit
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-300 font-medium text-sm">Capture or Upload Product Label</p>
              <p className="text-slate-500 text-xs mt-1">Supports JPG, PNG up to 10MB</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-slate-200 font-medium text-sm">Analyzing Legal Metrology Compliance</p>
              <p className="text-slate-400 text-xs mt-1">Running OCR + Groq AI Entity Extraction (3s)...</p>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <p className="text-amber-400 text-xs text-center mt-2">{cameraError}</p>
      )}

      {/* Control Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
        {isCameraActive ? (
          <>
            <button
              onClick={captureFrame}
              disabled={isScanning}
              className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg shadow-lg shadow-teal-900/30 transition flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
              <span>Capture Label</span>
            </button>
            <button
              onClick={stopCamera}
              className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startCamera}
              disabled={isScanning}
              className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg shadow-lg shadow-teal-900/30 transition flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>Open Camera</span>
            </button>

            <label className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 cursor-pointer transition flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Upload Label Image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isScanning}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onFileSelect(e.target.files[0]);
                  }
                }}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
