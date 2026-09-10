'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { requestPasswordResetAction } from '@/lib/actions';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    const formData = new FormData();
    formData.append('username', username.trim());
    if (notes.trim()) formData.append('notes', notes.trim());

    startTransition(async () => {
      try {
        await requestPasswordResetAction(formData);
        setSubmitted(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to submit reset request.');
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      <div className="w-full max-w-md space-y-6 rounded-[24px] border border-slate-200/80 bg-white p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>

        <div>
          <div className="w-12 h-12 relative mb-4">
            <Image
              src="/logo.png"
              alt="L&B Recruitment Services"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Enter your username and an administrator will be notified to reset your credentials.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Request Received</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your reset request has been logged. Please contact your system administrator to proceed.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Optional Message / Notes for Admin
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Locked out of mobile device"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 shadow-sm transition-all"
            >
              {isPending ? 'Submitting Request...' : 'Submit Reset Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
