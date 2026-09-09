import React from 'react';

export default function ViolationList({ violations = [] }) {
  if (!violations || violations.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          No Legal Metrology Violations Detected
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          All mandatory declarations comply fully with Legal Metrology (Packaged Commodities) Rules, 2011 provisions.
        </p>
      </div>
    );
  }

  const getSeverityStyle = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-500/10 text-red-400 border-red-500/30',
          border: 'border-l-red-500',
          icon: 'text-red-400',
        };
      case 'HIGH':
      case 'MAJOR':
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          border: 'border-l-amber-500',
          icon: 'text-amber-400',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
          border: 'border-l-yellow-500',
          icon: 'text-yellow-400',
        };
      case 'LOW':
      case 'MINOR':
      default:
        return {
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          border: 'border-l-blue-500',
          icon: 'text-blue-400',
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
          <span>Non-Compliance Violations</span>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            {violations.length}
          </span>
        </h3>
        <span className="text-xs text-slate-400">
          Ranked by enforcement severity
        </span>
      </div>

      <div className="space-y-3">
        {violations.map((violation, idx) => {
          const style = getSeverityStyle(violation.severity);
          const legalRef = violation.clause_reference || violation.legal_reference;
          const description = violation.explanation || violation.description || violation.rule_name;

          return (
            <div
              key={idx}
              className={`bg-slate-900 border border-slate-800 border-l-4 ${style.border} rounded-xl p-5 shadow-sm space-y-3 transition hover:border-slate-700`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase border ${style.badge}`}>
                    {violation.severity || 'MAJOR'}
                  </span>
                  <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {violation.rule_code}
                  </span>
                </div>
                {legalRef && (
                  <span className="text-[11px] text-teal-400 font-medium">
                    {legalRef}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {description}
                </p>
              </div>

              {/* Expected vs Actual details */}
              {(violation.expected || violation.actual) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                  {violation.expected && (
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Statutory Requirement
                      </span>
                      <span className="text-emerald-400 font-medium">
                        {violation.expected}
                      </span>
                    </div>
                  )}
                  {violation.actual && (
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Detected on Packaging
                      </span>
                      <span className="text-red-300 font-medium">
                        {violation.actual}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
