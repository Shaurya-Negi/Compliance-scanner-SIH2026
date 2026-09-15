import React from 'react';

export default function MultiFactorVerificationCard({ verificationData }) {
  if (!verificationData) return null;

  const {
    status = 'GREEN',
    status_label = 'VERIFIED / MATCH',
    summary,
    reasons = [],
    is_variant_difference = false,
    is_uncataloged_product = false,
    is_counterfeit_suspected = false,
    barcode_factor = {},
    reference_factor = {},
    ocr_factor = {},
    comparison_matrix = [],
    officer_guidance
  } = verificationData;

  // Tri-State Badge & Card Accent Theming
  const statusConfig = {
    GREEN: {
      bg: 'bg-emerald-950/20 border-emerald-500/40',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ),
      glow: 'shadow-emerald-950/40',
      title: 'Multi-Factor Verification Passed'
    },
    YELLOW: {
      bg: 'bg-amber-950/25 border-amber-500/40',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      glow: 'shadow-amber-950/40',
      title: 'Needs Verification (Legitimate Variant / Unlisted Catalog)'
    },
    RED: {
      bg: 'bg-rose-950/30 border-rose-500/40',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      glow: 'shadow-rose-950/40',
      title: 'Possible Manipulation / Non-Compliance'
    }
  };

  const currentTheme = statusConfig[status] || statusConfig.GREEN;

  // Helper for Comparison Matrix Match Status Badges
  const renderMatchBadge = (matchStatus) => {
    switch (matchStatus) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
            MATCH
          </span>
        );
      case 'VARIANT_DIFFERENCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
            PACK VARIANT
          </span>
        );
      case 'UNLISTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-1.5"></span>
            UNLISTED DB
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
            MISMATCH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
            {matchStatus}
          </span>
        );
    }
  };

  return (
    <div className={`border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${currentTheme.bg} ${currentTheme.glow}`}>
      {/* Card Header & Tri-State Classification */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${currentTheme.iconBg}`}>
            {currentTheme.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-0.5 text-xs font-black tracking-wider uppercase rounded-full border ${currentTheme.badge}`}>
                {status_label}
              </span>
              {is_variant_difference && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Regional / Pack Variant
                </span>
              )}
              {is_uncataloged_product && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  Uncataloged in Open Food Facts
                </span>
              )}
              {is_counterfeit_suspected && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/40">
                  Flagged for Inspection
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
              {currentTheme.title}
            </h3>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          <span>4-Factor Cross-Verification Engine</span>
        </div>
      </div>

      {/* Summary Banner & Reason Explanations */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start space-x-2.5">
          <span className="text-sm mt-0.5">🔍</span>
          <p className="text-sm text-slate-200 font-medium leading-relaxed">
            {summary || 'Multi-factor cross-analysis evaluated barcode checksum, reference catalog identity, and packaging OCR declarations.'}
          </p>
        </div>

        {reasons.length > 0 && (
          <div className="space-y-1.5 pl-6 border-l-2 border-slate-700/60 pt-1">
            {reasons.map((reason, idx) => (
              <p key={idx} className="text-xs text-slate-300 flex items-start">
                <span className="text-teal-400 font-bold mr-2">•</span>
                <span>{reason}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 3 Pillars Overview Cards (Barcode vs Reference DB vs Packaging OCR) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Barcode Factor */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <span className="mr-1.5">🔢</span> 1. Barcode Integrity
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              barcode_factor.checksum_valid
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {barcode_factor.checksum_valid ? 'Checksum Valid' : 'Invalid Checksum'}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">GTIN Code:</span>
              <span className="font-mono font-bold text-cyan-300">{barcode_factor.barcode || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Format:</span>
              <span className="text-slate-300">{barcode_factor.format || 'EAN-13'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Country Origin:</span>
              <span className="text-slate-300 font-medium">{barcode_factor.country_name || 'India (890)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">EAN Modulo-10:</span>
              <span className={barcode_factor.checksum_valid ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                {barcode_factor.checksum_valid ? 'Verified Passed' : 'Failed / Corrupted'}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Open Food Facts Reference DB */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <span className="mr-1.5">🌐</span> 2. Open Food Facts API v3
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              reference_factor.found
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
            }`}>
              {reference_factor.found ? 'Catalog Match' : 'Uncataloged GTIN'}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Brand:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[140px]">{reference_factor.brand || 'Not listed'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commodity:</span>
              <span className="text-slate-200 truncate max-w-[140px]">{reference_factor.product_name || 'Not cataloged'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Catalog Qty:</span>
              <span className="text-slate-300 font-mono">{reference_factor.quantity || 'Unspecified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Source:</span>
              <span className="text-slate-400 text-[11px] truncate max-w-[140px]">{reference_factor.source || 'Open Food Facts v3'}</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Physical Packaging OCR */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <span className="mr-1.5">📷</span> 3. Packaging OCR Data
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
              {ocr_factor.surfaces_analyzed || 1} Surface(s) Analyzed
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Declared Brand:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[140px]">{ocr_factor.brand || 'Declared on label'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commodity Name:</span>
              <span className="text-slate-200 truncate max-w-[140px]">{ocr_factor.product_name || 'Extracted via OCR'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Physical Net Qty:</span>
              <span className="text-slate-300 font-mono font-bold text-teal-300">{ocr_factor.net_quantity || 'Declared on pack'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MRP / Taxes:</span>
              <span className="text-slate-300">{ocr_factor.mrp || 'Extracted from label'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Way Cross-Verification Comparison Matrix Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center">
              <span className="mr-2">⚖️</span> 3-Way Cross-Verification Matrix
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side reconciliation between Barcode GS1 Database, Open Food Facts Reference, and Physical Packaging OCR
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4 sm:px-6">Attribute Field</th>
                <th className="py-3 px-4 sm:px-6">Open Food Facts / Reference DB</th>
                <th className="py-3 px-4 sm:px-6">Physical Packaging OCR</th>
                <th className="py-3 px-4 sm:px-6 text-center">Match Status</th>
                <th className="py-3 px-4 sm:px-6">Reconciliation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comparison_matrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-200">
                    {item.field}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-400 font-mono max-w-xs truncate">
                    {item.barcode_db_value || 'Not listed'}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-200 font-mono font-medium max-w-xs truncate">
                    {item.ocr_package_value || 'Not detected'}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">
                    {renderMatchBadge(item.match_status)}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-400 leading-relaxed text-[11px] max-w-sm">
                    {item.note || 'Consistent with Legal Metrology declarations.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Guidance for Legal Metrology Officers */}
      {officer_guidance && (
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-start space-x-3">
          <span className="text-base mt-0.5">🏛️</span>
          <div>
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Legal Metrology Officer Guidance (Section 36 Compliance)
            </h5>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {officer_guidance}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
