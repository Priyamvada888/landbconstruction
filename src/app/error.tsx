'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in production for monitoring
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            An unexpected error occurred. Your data is safe — please try refreshing the page or
            going back to the dashboard.
          </p>
          {error.digest && (
            <p className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 inline-block">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
