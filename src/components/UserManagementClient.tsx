'use client';

import { useState, useTransition } from 'react';
import { Users, UserPlus, ShieldCheck, ShieldAlert, KeyRound, X, Check, Lock } from 'lucide-react';
import { Profile, UserRole } from '@/types/database';
import { inviteUserAction, resetUserPasswordAction } from '@/lib/actions';

interface UserManagementClientProps {
  profiles: Profile[];
  currentRole: UserRole;
}

export function UserManagementClient({ profiles, currentRole }: UserManagementClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (currentRole !== 'admin') {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Access Denied: Administrator Only</h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Internal user management and staff account provisioning is restricted to Administrators.
        </p>
      </div>
    );
  }

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await inviteUserAction(formData);
        setIsCreateOpen(false);
        setSuccessMsg(`User "${formData.get('username')}" created successfully.`);
        form.reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to provision account');
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setError(null);

    startTransition(async () => {
      try {
        await resetUserPasswordAction(resetTargetUser.id, newPassword);
        setSuccessMsg(`Password reset successfully for "${resetTargetUser.username}".`);
        setResetTargetUser(null);
        setNewPassword('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to reset password');
      }
    });
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              Admin Only
            </span>
            <span className="text-xs text-slate-400">• Username & Password Authentication</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Staff Accounts & Security
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage staff credentials, passwords, and administrative access levels without email requirements.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsCreateOpen(true);
          }}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Staff Account</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mobile Staff Account Cards (< lg) */}
      <div className="lg:hidden space-y-3">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-bold font-mono text-slate-900 text-sm block">
                  @{p.username}
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {p.full_name || 'Staff User'}
                </span>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  p.role === 'admin'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {p.role.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
              {p.role === 'admin'
                ? 'Full Access (Bank accounts, Payroll, User management, Rates)'
                : 'Recruiter (Manage Jobs, Candidate matching, Log hours)'}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => {
                  setResetTargetUser(p);
                  setNewPassword('');
                  setError(null);
                }}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Profiles Table (>= lg) */}
      <div className="hidden lg:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/60 uppercase font-bold text-slate-400 tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Username</th>
                <th className="px-4 py-3.5">Full Name</th>
                <th className="px-4 py-3.5">System Role</th>
                <th className="px-4 py-3.5">Permissions Scope</th>
                <th className="px-4 py-3.5 text-right">Password Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold font-mono text-indigo-600 text-sm">
                    @{p.username}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {p.full_name || 'Staff User'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        p.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {p.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {p.role === 'admin'
                      ? 'Full Access (Bank accounts, Payroll, User management, Rates)'
                      : 'Recruiter (Manage Jobs, Candidate matching, Log hours)'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setError(null);
                        setResetTargetUser(p);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset Password</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Create Staff Account</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Username * (Unique identifier)
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  autoCapitalize="none"
                  placeholder="e.g. jsmith or sarah_recruiter"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Initial Password * (min 6 characters)
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  System Role
                </label>
                <select
                  name="role"
                  defaultValue="staff"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="staff">Staff (Recruiter / Coordinator)</option>
                  <option value="admin">Administrator (Full Access & Payroll)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                  {isPending ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Reset Staff Password</h2>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="mt-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="text-slate-400 text-[11px]">Target User:</p>
                <p className="text-slate-900 font-bold text-sm mt-0.5">
                  @{resetTargetUser.username} ({resetTargetUser.full_name || 'Staff'})
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  New Password * (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                  {isPending ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
