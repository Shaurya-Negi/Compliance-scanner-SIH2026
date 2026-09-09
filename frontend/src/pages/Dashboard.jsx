import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsRes, productsRes, scansRes] = await Promise.all([
        api.get('/api/v1/analytics/dashboard'),
        api.get('/api/v1/products?limit=10'),
        api.get('/api/v1/scans/recent?limit=8'),
      ]);

      setAnalytics(analyticsRes.data);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data?.products || []));
      setRecentScans(Array.isArray(scansRes.data) ? scansRes.data : (scansRes.data?.scans || []));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load dashboard data. Ensure the backend is running and you are authenticated.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-6"></div>
        <p className="text-slate-300 text-lg font-medium">Loading Inspector Dashboard...</p>
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
          <h2 className="text-xl font-bold text-red-300 mb-2">Dashboard Unavailable</h2>
          <p className="text-sm text-red-200 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition"
          >
            Login as Inspector
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total_scans: analytics?.total_scans ?? analytics?.summary?.total_scans ?? 0,
    avg_score: analytics?.avg_compliance_score ?? analytics?.summary?.avg_score ?? 0.0,
    compliant_count: analytics?.compliant_scans_count ?? analytics?.summary?.compliant_count ?? 0,
    non_compliant_count: analytics?.non_compliant_scans_count ?? analytics?.summary?.non_compliant_count ?? 0,
  };
  const violationTrend = analytics?.violation_trend || [];
  const topViolations = analytics?.top_violations || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">
            Inspector Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Legal Metrology Compliance Monitoring System
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          <span>New Scan</span>
        </button>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Scans</p>
              <p className="text-3xl font-black text-slate-100 mt-2">{stats.total_scans || 0}</p>
            </div>
            <div className="w-12 h-12 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">All-time inspections</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Avg. Score</p>
              <p className="text-3xl font-black text-emerald-400 mt-2">{stats.avg_score?.toFixed(1) || '0.0'}%</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Compliance across products</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Compliant</p>
              <p className="text-3xl font-black text-teal-400 mt-2">{stats.compliant_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">≥80% score products</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Non-Compliant</p>
              <p className="text-3xl font-black text-red-400 mt-2">{stats.non_compliant_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">&lt;50% score products</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violation Trend Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Violation Trend (Last 7 Days)
          </h3>
          {violationTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={violationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">No trend data available</p>
          )}
        </div>

        {/* Top Violations Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Most Frequent Violations
          </h3>
          {topViolations.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topViolations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <YAxis dataKey="rule_code" type="category" width={80} stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {topViolations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f87171' : index === 1 ? '#fbbf24' : '#14b8a6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">No violation data available</p>
          )}
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100">Recent Scans</h3>
          <p className="text-xs text-slate-400 mt-0.5">Latest commodity inspections</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Product</th>
                <th className="py-3.5 px-6 font-semibold">Scanned At</th>
                <th className="py-3.5 px-6 font-semibold text-center">Score</th>
                <th className="py-3.5 px-6 font-semibold text-center">Status</th>
                <th className="py-3.5 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentScans.length > 0 ? (
                recentScans.map((scan) => {
                  const score = scan.score ?? scan.compliance_score ?? 0;
                  let statusColor = 'bg-red-500/10 text-red-400 border-red-500/30';
                  let statusLabel = 'Non-Compliant';
                  if (score >= 80) {
                    statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    statusLabel = 'Compliant';
                  } else if (score >= 50) {
                    statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    statusLabel = 'Partial';
                  }

                  const scanDate = scan.created_at || scan.timestamp;

                  return (
                    <tr key={scan.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-6 font-semibold text-slate-200">
                        {scan.product_name || 'Unknown Product'}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {scanDate ? new Date(scanDate).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-bold text-slate-200">{score}%</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => navigate(`/result/${scan.id}`)}
                          className="text-teal-400 hover:text-teal-300 text-xs font-medium underline"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500 text-sm">
                    No scans available. Start scanning products to populate the dashboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Catalog */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100">Product Catalog</h3>
          <p className="text-xs text-slate-400 mt-0.5">Aggregated commodity compliance profiles</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6 font-semibold">Product Name</th>
                <th className="py-3.5 px-6 font-semibold">Brand</th>
                <th className="py-3.5 px-6 font-semibold text-center">Avg. Score</th>
                <th className="py-3.5 px-6 font-semibold text-center">Scans</th>
                <th className="py-3.5 px-6 font-semibold">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.length > 0 ? (
                products.map((product) => {
                  const prodDate = product.last_scanned_at || product.last_updated || product.created_at;
                  return (
                    <tr key={product.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-6 font-semibold text-slate-200">{product.name}</td>
                      <td className="py-4 px-6 text-slate-400">{product.brand || 'N/A'}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-bold text-teal-400">{product.avg_score?.toFixed(1) || '0.0'}%</span>
                      </td>
                      <td className="py-4 px-6 text-center text-slate-300">{product.total_scans ?? product.scan_count ?? 1}</td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {prodDate ? new Date(prodDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500 text-sm">
                    No products cataloged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
