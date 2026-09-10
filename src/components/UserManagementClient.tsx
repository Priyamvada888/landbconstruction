'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  X,
  Check,
  Edit,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Profile, UserRole, PasswordResetRequest } from '@/types/database';
import {
  inviteUserAction,
  resetUserPasswordAction,
  updateUserAction,
  deleteUserAction,
  resolvePasswordResetRequestAction,
  dismissPasswordResetRequestAction,
} from '@/lib/actions';

interface UserManagementClientProps {
  profiles: Profile[];
  passwordResetRequests?: PasswordResetRequest[];
  currentRole: UserRole;
}

export function UserManagementClient({
  profiles,
  passwordResetRequests = [],
  currentRole,
}: UserManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state to guarantee immediate responsive UI
  const [profilesList, setProfilesList] = useState<Profile[]>(profiles);
  const [requestsList, setRequestsList] = useState<PasswordResetRequest[]>(passwordResetRequests);

  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<Profile | null>(null);
  const [resolveTargetRequest, setResolveTargetRequest] = useState<PasswordResetRequest | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setProfilesList(profiles);
  }, [profiles]);

  useEffect(() => {
    setRequestsList(passwordResetRequests);
  }, [passwordResetRequests]);

  const pendingRequestsCount = requestsList.filter((r) => r.status === 'pending').length;

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

  // CREATE USER
  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await inviteUserAction(formData);
        if (res.profile) {
          setProfilesList((prev) => [...prev, res.profile]);
        }
        setIsCreateOpen(false);
        setSuccessMsg(`User "${formData.get('username')}" created successfully.`);
        form.reset();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to provision account');
      }
    });
  };

  // EDIT USER
  const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSuccessMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await updateUserAction(editingUser.id, formData);
        if (res.profile) {
          setProfilesList((prev) =>
            prev.map((p) => (p.id === editingUser.id ? res.profile : p))
          );
        }
        setEditingUser(null);
        setSuccessMsg(`Account "${formData.get('username')}" updated successfully.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-profile-updated'));
        }
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update account');
      }
    });
  };

  // DELETE USER
  const handleDeleteUser = (user: Profile) => {
    if (!confirm(`Are you sure you want to permanently delete user @${user.username}?`)) {
      return;
    }
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await deleteUserAction(user.id);
        setProfilesList((prev) => prev.filter((p) => p.id !== user.id));
        setSuccessMsg(`User @${user.username} deleted.`);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete user');
      }
    });
  };

  // RESET PASSWORD FOR A USER DIRECTLY
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
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to reset password');
      }
    });
  };

  // RESOLVE PASSWORD RESET REQUEST
  const handleResolveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTargetRequest) return;
    setError(null);

    startTransition(async () => {
      try {
        await resolvePasswordResetRequestAction(resolveTargetRequest.id, newPassword);
        setRequestsList((prev) =>
          prev.map((r) =>
            r.id === resolveTargetRequest.id
              ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() }
              : r
          )
        );
        setSuccessMsg(`Password reset and request resolved for @${resolveTargetRequest.username}.`);
        setResolveTargetRequest(null);
        setNewPassword('');
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to resolve request');
      }
    });
  };

  // DISMISS PASSWORD RESET REQUEST
  const handleDismissRequest = (reqId: string) => {
    if (!confirm('Dismiss this password reset request?')) return;
    setError(null);

    startTransition(async () => {
      try {
        await dismissPasswordResetRequestAction(reqId);
        setRequestsList((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? { ...r, status: 'dismissed', resolved_at: new Date().toISOString() }
              : r
          )
        );
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to dismiss request');
      }
    });
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              Admin Only
            </span>
            <span className="text-xs text-slate-400">• Team & Security Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Staff Accounts & Security Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage staff credentials, edit permissions, remove accounts, and process password reset requests.
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {profilesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Password Reset Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-500 text-slate-950 animate-pulse">
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <>
          {/* Mobile Staff Account Cards (< lg) */}
          <div className="lg:hidden space-y-3">
            {profilesList.map((p) => (
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
                        ? 'text-purple-700 border-purple-300'
                        : 'text-blue-700 border-blue-300'
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

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingUser(p);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setResetTargetUser(p);
                      setNewPassword('');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset Pass</span>
                  </button>

                  <button
                    onClick={() => handleDeleteUser(p)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profilesList.map((p) => (
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
                              ? 'text-purple-700 border-purple-300'
                              : 'text-blue-700 border-blue-300'
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUser(p);
                              setError(null);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setError(null);
                              setResetTargetUser(p);
                              setNewPassword('');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(p)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PASSWORD RESET REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Submitted Password Reset Requests
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requests submitted from the public forgot-password portal by staff members.
                </p>
              </div>
            </div>

            {requestsList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
                No password reset requests recorded.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/60 uppercase font-bold text-slate-400 tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Requested Username</th>
                      <th className="px-4 py-3">Requested Time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requestsList.map((req) => {
                      const userExists = profilesList.some(
                        (p) => p.username.toLowerCase() === req.username.toLowerCase()
                      );
                      const timeStr = new Date(req.requested_at).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            @{req.username}
                            {!userExists && (
                              <span className="ml-2 text-[10px] text-amber-600 font-sans font-normal">
                                (Username not found)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{timeStr}</td>
                          <td className="px-4 py-3">
                            {req.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-700 border border-amber-300">
                                <Clock className="w-3 h-3" />
                                PENDING
                              </span>
                            ) : req.status === 'resolved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                RESOLVED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600 border border-slate-300">
                                <XCircle className="w-3 h-3" />
                                DISMISSED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{req.notes || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setResolveTargetRequest(req);
                                    setNewPassword('');
                                    setError(null);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  <span>Reset & Resolve</span>
                                </button>
                                <button
                                  onClick={() => handleDismissRequest(req.id)}
                                  className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                                >
                                  Dismiss
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Account Modal */}
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

      {/* MODAL 2: Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Edit User Account</h2>
              </div>
              <button
                onClick={() => setEditingUser(null)}
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

            <form onSubmit={handleEditUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  defaultValue={editingUser.username}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  defaultValue={editingUser.full_name || ''}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  System Role
                </label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="staff">Staff (Recruiter / Coordinator)</option>
                  <option value="admin">Administrator (Full Access & Payroll)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Change Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  name="new_password"
                  minLength={6}
                  placeholder="New password (optional)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Direct User Password Reset */}
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

      {/* MODAL 4: Resolve Request & Set Password Modal */}
      {resolveTargetRequest && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Resolve Reset Request</h2>
              </div>
              <button
                onClick={() => setResolveTargetRequest(null)}
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

            <form onSubmit={handleResolveRequest} className="mt-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="text-slate-400 text-[11px]">Requested by Username:</p>
                <p className="text-slate-900 font-bold text-sm mt-0.5">
                  @{resolveTargetRequest.username}
                </p>
                <p className="text-slate-400 text-[11px] mt-1">
                  Requested on {new Date(resolveTargetRequest.requested_at).toLocaleString('en-GB')}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assign New Password * (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password for user"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveTargetRequest(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                  {isPending ? 'Resolving...' : 'Reset Password & Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
