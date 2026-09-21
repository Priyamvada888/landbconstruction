'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Application Error</h1>
              <p className="text-sm text-slate-500">
                A critical error occurred. Please refresh the page.
              </p>
              {error.digest && (
                <p className="mt-2 text-[11px] font-mono text-slate-400">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload App
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
