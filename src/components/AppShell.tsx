'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  PoundSterling,
  Settings,
  LogOut,
  ShieldCheck,
  HardHat,
} from 'lucide-react';
import { logoutAction } from '@/lib/auth-actions';

interface UserInfo {
  username: string;
  fullName: string | null | undefined;
  role: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const fetchUser = () => {
      fetch('/api/me')
        .then((r) => r.json())
        .then((data) => {
          if (data?.username) setUser(data);
        })
        .catch(() => null);
    };

    fetchUser();

    const handleProfileUpdate = () => {
      fetchUser();
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    window.addEventListener('focus', handleProfileUpdate);

    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      window.removeEventListener('focus', handleProfileUpdate);
    };
  }, [pathname]);

  // If on login or public auth page, render without the app shell frame
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password';

  if (isAuthPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Sites', href: '/jobs', icon: Briefcase },
    { name: 'Operators', href: '/operators', icon: HardHat },
    { name: 'Timesheets', href: '/timesheets', icon: Clock },
    ...(user?.role === 'admin'
      ? [{ name: 'Payroll', href: '/payroll', icon: PoundSterling }]
      : []),
    { name: 'Team', href: '/users', icon: Settings },
  ];

  const displayName = user?.fullName || user?.username || 'Admin';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col md:flex-row font-sans antialiased text-slate-800">
      
      {/* Mobile Top App Bar (< md) */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="L&B Recruitment Services"
            width={34}
            height={34}
            className="w-8 h-8 object-contain"
            priority
          />
          <div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-tight">
              L&B Staff
            </span>
            <span className="text-[10px] font-semibold text-slate-400 block leading-none">
              Plant & Civils CRM
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/60">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
              {initials || 'AD'}
            </div>
            <span className="text-[10px] font-bold text-slate-700 capitalize">
              {user?.role === 'admin' ? 'Admin' : 'Staff'}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out of system"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Desktop Left Sidebar (>= md) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-white border-r border-slate-200/80 p-5 flex-col justify-between flex-shrink-0 md:sticky md:top-0 md:h-screen">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 relative flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="L&B Recruitment Services"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-base tracking-tight group-hover:text-indigo-600 transition-colors block leading-tight">
                  L&B Staff
                </span>
                <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">Plant & Civils CRM</p>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {/* Active vertical pill accent */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: User Profile & Sign Out */}
        <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {initials || 'AD'}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                {displayName.split('(')[0].trim()}
              </p>
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {user?.role === 'admin' ? 'Administrator' : 'Staff'}
              </span>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out of system"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-4 sm:p-6 lg:p-10 pt-5 sm:pt-6 pb-28 md:pb-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Dock (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-semibold">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
