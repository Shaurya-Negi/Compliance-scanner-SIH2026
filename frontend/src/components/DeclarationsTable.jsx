import React from 'react';

export default function DeclarationsTable({ ruleChecks = [], extractedEntities = {} }) {
  // If ruleChecks is available, render based on rule checks
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-100">
            Rule 6 Mandatory Declarations Checklist
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Legal Metrology (Packaged Commodities) Rules, 2011 Verification Matrix
          </p>
        </div>
        <div className="text-xs text-slate-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5"></span>
          Passed
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 ml-3 mr-1.5"></span>
          Non-Compliant
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-6 font-semibold">Mandatory Declaration</th>
              <th className="py-3.5 px-6 font-semibold">Extracted Value</th>
              <th className="py-3.5 px-6 font-semibold">Legal Rule</th>
              <th className="py-3.5 px-6 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {ruleChecks.map((check, idx) => {
              const isPassed = check.passed;
              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/30 transition ${
                    isPassed ? '' : 'bg-red-950/10'
                  }`}
                >
                  {/* Declaration Name & Details */}
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-200">
                      {check.rule_name}
                    </div>
                    {(check.explanation || check.details) && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {check.explanation || check.details}
                      </div>
                    )}
                  </td>

                  {/* Extracted Value */}
                  <td className="py-4 px-6">
                    <div className="font-mono text-xs text-slate-300 max-w-xs truncate bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                      {check.actual || check.extracted_value || (isPassed ? 'Compliant' : <span className="text-slate-500 italic">Not detected</span>)}
                    </div>
                  </td>

                  {/* Legal Rule */}
                  <td className="py-4 px-6 text-xs text-teal-400 font-medium">
                    {check.clause_reference || check.rule_code}
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-6 text-center">
                    {isPassed ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Fail
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
