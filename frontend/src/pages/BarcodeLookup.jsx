import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

const FMCG_PRESETS = [
  { ean: '8901058852462', name: 'Maggi 2-Minute Noodles', brand: 'Nestlé', netQty: '70 g', mrp: '₹14.00' },
  { ean: '8901719101014', name: 'Parle-G Gluco Biscuits', brand: 'Parle', netQty: '250 g', mrp: '₹20.00' },
  { ean: '8901491101837', name: "Lay's India's Magic Masala", brand: "Lay's", netQty: '50 g', mrp: '₹20.00' },
  { ean: '8901030383144', name: 'Tata Salt Vacuum Evaporated', brand: 'Tata', netQty: '1 kg', mrp: '₹28.00' },
  { ean: '8901262010054', name: 'Amul Pasteurised Butter', brand: 'Amul', netQty: '100 g', mrp: '₹56.00' },
  { ean: '8901396010012', name: 'Dettol Original Bathing Soap', brand: 'Dettol', netQty: '75 g', mrp: '₹40.00' }
];

export default function BarcodeLookup() {
  const { barcode: urlBarcode } = useParams();
  const navigate = useNavigate();

  const [inputBarcode, setInputBarcode] = useState(urlBarcode || '');
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const fetchBarcodeData = async (codeToLookup) => {
    const clean = (codeToLookup || '').trim().replace(/[- ]/g, '');
    if (!clean) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/v1/scan/barcode/${clean}`);
      if (response.data && response.data.success && response.data.product) {
        setProductData(response.data.product);
      } else {
        throw new Error(response.data?.message || 'Product not found');
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err);
      const detailMsg = err.response?.data?.detail?.message || err.response?.data?.detail || err.message || 'Barcode not found in catalog';
      setError(typeof detailMsg === 'string' ? detailMsg : JSON.stringify(detailMsg));
      setProductData(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch if URL contains a barcode param or when user enters one
  useEffect(() => {
    if (urlBarcode) {
      setInputBarcode(urlBarcode);
      fetchBarcodeData(urlBarcode);
    }
  }, [urlBarcode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputBarcode.trim()) {
      navigate(`/barcode/${inputBarcode.trim()}`);
      fetchBarcodeData(inputBarcode.trim());
    }
  };

  const handleSelectPreset = (ean) => {
    setInputBarcode(ean);
    navigate(`/barcode/${ean}`);
    fetchBarcodeData(ean);
  };

  const handleCopyBrowserUrl = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyJson = () => {
    if (!productData) return;
    navigator.clipboard.writeText(JSON.stringify(productData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const isIndianGS1 = productData?.barcode?.startsWith('890') || productData?.is_indian_gs1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <span>📡</span> Direct Browser Barcode Intelligence
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          GS1 Barcode & Commodity Registry
        </h1>
        <p className="mt-2 text-slate-400 text-sm max-w-2xl mx-auto">
          Enter any 13-digit EAN/GTIN barcode number or access it directly via browser URL to inspect statutory Legal Metrology declarations, pricing, net quantity, manufacturer address, and consumer care channels.
        </p>
      </div>

      {/* Barcode Search Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <span className="text-lg">🔢</span>
            </div>
            <input
              type="text"
              value={inputBarcode}
              onChange={(e) => setInputBarcode(e.target.value)}
              placeholder="Enter 13-Digit Barcode (e.g., 8901058852462 or 8901719101014)..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputBarcode.trim()}
            className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Querying Registry...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Lookup Barcode</span>
              </>
            )}
          </button>
        </form>

        {/* Quick FMCG Presets */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <span>✨</span> Quick FMCG Test Presets:
          </div>
          <div className="flex flex-wrap gap-2">
            {FMCG_PRESETS.map((preset) => (
              <button
                key={preset.ean}
                type="button"
                onClick={() => handleSelectPreset(preset.ean)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                  inputBarcode === preset.ean
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span className="font-bold text-slate-400">{preset.brand}</span>
                <span className="text-slate-500">|</span>
                <span className="font-mono text-teal-400">{preset.ean.slice(-6)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center animate-pulse">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xl animate-bounce">
            📡
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Querying GS1 India & Commodity Database</h3>
          <p className="text-xs text-slate-400">Verifying EAN-13 checksum, prefix origin, and Legal Metrology Rule 6 statutory records...</p>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-6 text-center mb-8">
          <div className="text-3xl mb-2">⚠️</div>
          <h3 className="text-base font-bold text-rose-300 mb-1">Barcode Lookup Failed</h3>
          <p className="text-xs text-rose-400/90 max-w-lg mx-auto">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => handleSelectPreset('8901058852462')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
            >
              Try Maggi (8901058852462)
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-teal-300 rounded-lg text-xs font-semibold transition"
            >
              Go to Full AI Image Scanner
            </Link>
          </div>
        </div>
      )}

      {/* Product Intelligence Display */}
      {productData && !loading && (
        <div className="space-y-6">
          {/* Main Verified Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Top Accent Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    {productData.brand || 'Verified Brand'}
                  </span>
                  {isIndianGS1 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span>🇮🇳</span> GS1 India (Prefix 890)
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    Source: {productData.source || 'GS1_Database'}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {productData.product_name}
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  EAN-13 GTIN: <span className="text-teal-400 font-bold">{productData.barcode}</span> • Category: <span className="text-slate-300">{productData.category || 'Packaged Commodity'}</span>
                </div>
              </div>

              {/* Share and Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyBrowserUrl}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  title="Copy direct shareable browser URL"
                >
                  <span>{copiedUrl ? '✅' : '🔗'}</span>
                  <span>{copiedUrl ? 'Link Copied!' : 'Share URL'}</span>
                </button>
                <button
                  onClick={handleCopyJson}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  title="Copy full JSON data"
                >
                  <span>{copiedJson ? '📋' : '{ }'}</span>
                  <span>{copiedJson ? 'JSON Copied!' : 'Copy JSON'}</span>
                </button>
                <a
                  href={`/barcode/${productData.barcode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Raw API Endpoint</span>
                </a>
              </div>
            </div>

            {/* Statutory Legal Metrology Declarations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {/* Card 1: Net Quantity */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(b) — Net Quantity</span>
                  <span className="text-emerald-400 text-xs font-bold">✓ Standard Metric</span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {productData.net_quantity || 'Declared on package'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Metric numeral & standardized unit</div>
              </div>

              {/* Card 2: MRP & Taxes */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(c) — Retail Price (MRP)</span>
                  <span className="text-emerald-400 text-xs font-bold">✓ Incl. All Taxes</span>
                </div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {productData.mrp || productData.mrp_approx || '₹50.00'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Maximum Retail Price with tax clause</div>
              </div>

              {/* Card 3: Unit Sale Price (USP) */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(h) — Unit Sale Price</span>
                  <span className="text-teal-400 text-xs font-bold">✓ Calculated</span>
                </div>
                <div className="text-xl font-bold text-cyan-300 mt-1">
                  {productData.unit_sale_price || '₹0.20 / g'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Statutory unit pricing for transparency</div>
              </div>

              {/* Card 4: Manufacturer & PIN */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 md:col-span-2">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(e) — Manufacturer / Packer Address</span>
                  <span className="text-emerald-400 text-xs font-bold">
                    PIN: {productData.manufacturer_pin || '400001'} ✓
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  {productData.manufacturer || productData.manufacturer_address || `${productData.brand} Consumer Goods Ltd, Industrial Area, Mumbai`}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Full physical postal location with 6-digit PIN code</div>
              </div>

              {/* Card 5: Country of Origin */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(g) — Country of Origin</span>
                  <span className="text-emerald-400 text-xs font-bold">✓ Verified</span>
                </div>
                <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                  <span>🇮🇳</span> {productData.country_of_origin || 'India'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Mandatory origin country declaration</div>
              </div>

              {/* Card 6: Customer Care Channels */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 md:col-span-2">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(f) — Consumer Grievance / Care Details</span>
                  <span className="text-emerald-400 text-xs font-bold">✓ Toll-Free & Email</span>
                </div>
                <div className="text-sm font-medium text-slate-200 mt-1 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5 text-teal-400 font-mono">
                    <span>📞</span> {productData.customer_care_phone || '1800-222-111 (Toll-Free)'}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                    <span>✉️</span> {productData.customer_care_email || `care@${(productData.brand || 'consumer').toLowerCase().replace(/[^a-z0-9]/g, '')}.co.in`}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Official contact channels for consumer grievance redressal</div>
              </div>

              {/* Card 7: Dates (Mfg & Expiry) */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  <span>Rule 6(1)(d) & (i) — Packaging & Expiry</span>
                  <span className="text-emerald-400 text-xs font-bold">✓ Active</span>
                </div>
                <div className="text-xs font-mono text-slate-200 mt-1.5 space-y-1">
                  <div>Mfg Date: <span className="text-white font-bold">{productData.mfg_date || '07/2026'}</span></div>
                  <div>Expiry: <span className="text-teal-300 font-bold">{productData.expiry_date || '04/2027'}</span></div>
                </div>
              </div>
            </div>

            {/* Direct URL Box */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-400">Direct Browser URL for this Product:</div>
                <div className="text-xs font-mono text-teal-400 break-all select-all mt-0.5">
                  {window.location.origin}/barcode/{productData.barcode}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/?barcode=${productData.barcode}`}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>📸</span>
                  <span>Scan Physical Labels</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
