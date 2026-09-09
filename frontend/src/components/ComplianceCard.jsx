import React from 'react';

export default function ComplianceCard({ scanData, onDownloadPdf, isDownloading }) {
  if (!scanData) return null;

  const score = scanData.score ?? scanData.compliance_score ?? 0;
  const checks = scanData.checks || scanData.rule_checks || [];
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length || 9;
  const violationsCount = scanData.violations?.length || 0;
  const criticalCount = scanData.violations?.filter((v) => v.severity?.toLowerCase() === 'critical').length || 0;

  // Determine status color theme
  let statusColor = 'text-red-400 bg-red-500/10 border-red-500/30';
  let scoreColor = 'text-red-400';
  let strokeColor = '#f87171';
  let statusLabel = scanData.status || 'Non-Compliant';

  if (score >= 80) {
    statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    scoreColor = 'text-emerald-400';
    strokeColor = '#34d399';
    statusLabel = scanData.status || 'Compliant';
  } else if (score >= 50) {
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    scoreColor = 'text-amber-400';
    strokeColor = '#fbbf24';
    statusLabel = scanData.status || 'Partial Compliance';
  }

  // Circular progress calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const productName = scanData.entities?.product_name || scanData.product_name || 'Packaged Commodity';
  const scanDate = scanData.created_at || scanData.timestamp;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Score Gauge & Status */}
        <div className="flex items-center space-x-6">
          <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={strokeColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-2xl font-black ${scoreColor}`}>
                {score}%
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-xs text-slate-500">
                Rule 6 Enforcement
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
              {productName}
            </h2>
            <p className="text-xs text-slate-400">
              Scanned on {scanDate ? new Date(scanDate).toLocaleString() : 'Recent'} • Processed in {scanData.processing_time_ms ? `${(scanData.processing_time_ms / 1000).toFixed(2)}s` : '1.8s'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="w-full sm:w-auto px-5 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-950/40 transition flex items-center justify-center space-x-2"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Audit Report (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metric Tiles Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
          <p className="text-xs text-slate-400">Declarations Checked</p>
          <p className="text-lg font-bold text-slate-200 mt-0.5">
            {passedCount} / {totalCount}
          </p>
        </div>
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
          <p className="text-xs text-slate-400">Total Violations</p>
          <p className={`text-lg font-bold mt-0.5 ${violationsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {violationsCount}
          </p>
        </div>
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
          <p className="text-xs text-slate-400">Critical Flags</p>
          <p className={`text-lg font-bold mt-0.5 ${criticalCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {criticalCount}
          </p>
        </div>
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
          <p className="text-xs text-slate-400">Estimated Label Area</p>
          <p className="text-lg font-bold text-teal-400 mt-0.5">
            {scanData.label_area_cm2 ? `${scanData.label_area_cm2.toFixed(1)} cm²` : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
