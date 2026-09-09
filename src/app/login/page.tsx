'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doLogin = async (u: string, p: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid username or password.');
        setLoading(false);
        return;
      }

      // Hard redirect so the browser picks up the new cookie
      window.location.href = '/dashboard';
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(username, password);
  };

  const handleQuickLogin = () => {
    setUsername('admin');
    setPassword('password123');
    doLogin('admin', 'password123');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Login Card */}
      <div className="w-full max-w-md lg:max-w-5xl bg-white rounded-[28px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[600px]">

        {/* Left: Form */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-14 flex flex-col justify-between">
          <div>
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="L&B Recruitment Services"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                  priority
                />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 tracking-tight text-base block leading-tight">
                  L&B Staff Manager
                </span>
                <span className="text-[11px] font-semibold text-slate-500 tracking-wide block">
                  Plant & Civils Recruitment
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              Sign in to manage plant operators, job allocations, and payroll.
            </p>

            {error && (
              <div className="mt-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-6 sm:mt-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <button
                id="sign-in-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Signing in…' : 'Sign in'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center sm:text-left">
            <p className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">
              © 2026 L&B Recruitment Services LTD
            </p>
          </div>
        </div>

        {/* Right: Minimal Construction Image (Desktop only - removed on mobile for clean app feel) */}
        <div className="hidden lg:flex lg:col-span-6 p-4 sm:p-5 lg:p-6 items-center">
          <div className="relative w-full h-full min-h-[500px] rounded-[22px] overflow-hidden bg-slate-100 shadow-sm border border-slate-200/60">
            <Image
              src="/hero.png"
              alt="Construction Site Plant and Civil Infrastructure"
              fill
              sizes="50vw"
              className="object-cover object-center"
              priority
            />
          </div>
        </div>

      </div>
    </div>
  );
}
