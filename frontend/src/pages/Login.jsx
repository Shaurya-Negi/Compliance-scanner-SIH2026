import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';

    try {
      const response = await api.post(endpoint, formData);

      if (response.data.access_token) {
        localStorage.setItem('sih_access_token', response.data.access_token);
        localStorage.setItem('sih_user', JSON.stringify(response.data.user || { email: formData.email }));
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(
        err.response?.data?.detail || `${isLogin ? 'Login' : 'Registration'} failed. Please check your credentials and try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/20 border border-teal-500/40 rounded-xl text-teal-400 text-2xl font-bold mb-4">
            LM
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 mb-2">
            {isLogin ? 'Inspector Login' : 'Create Account'}
          </h1>
          <p className="text-sm text-slate-400">
            Legal Metrology Compliance Portal
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="text-xs text-red-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="inspector@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1.5">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-teal-950/40 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="ml-2 text-teal-400 hover:text-teal-300 font-semibold transition"
              >
                {isLogin ? 'Register here' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
            Demo Credentials (Hackathon)
          </p>
          <div className="text-xs text-slate-500 space-y-1">
            <p><span className="text-slate-400 font-mono">inspector@sih.gov.in</span> / <span className="text-slate-400 font-mono">demo2026</span></p>
            <p className="text-[10px] text-slate-600 mt-2">Or create your own account above</p>
          </div>
        </div>

        {/* Public Access Note */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-teal-400 transition"
          >
            Continue as public consumer (no login required)
          </button>
        </div>
      </div>
    </div>
  );
}
