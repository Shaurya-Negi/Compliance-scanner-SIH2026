import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('sih_access_token');
  const user = JSON.parse(localStorage.getItem('sih_user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('sih_access_token');
    localStorage.removeItem('sih_user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-lg">
                LM
              </div>
              <div>
                <span className="font-bold text-lg text-slate-100">SIH26034</span>
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  AI Scanner
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-slate-800 text-teal-400'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              Scanner
            </Link>

            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-slate-800 text-teal-400'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              Dashboard
            </Link>

            {/* Auth Actions */}
            {token ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <span className="text-xs text-slate-400 hidden sm:inline-block">
                  {user?.name || user?.email || 'Inspector'}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white rounded transition"
              >
                Officer Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
