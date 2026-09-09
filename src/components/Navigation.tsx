'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  HardHat,
  Briefcase,
  Clock,
  PoundSterling,
  Users,
  ShieldCheck,
  Menu,
  X,
  Building2,
  LogOut,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { UserRole } from '@/types/database';
import { toggleRoleAction } from '@/lib/actions';
import { logoutAction } from '@/lib/auth-actions';

interface NavigationProps {
  currentRole: UserRole;
}

export function Navigation({ currentRole }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRoleToggle = (targetRole: UserRole) => {
    startTransition(async () => {
      await toggleRoleAction(targetRole);
    });
  };

  const navItems = [
    { name: 'Board', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Operators', href: '/operators', icon: HardHat },
    { name: 'Timesheets', href: '/timesheets', icon: Clock },
    ...(currentRole === 'admin'
      ? [
          { name: 'Payroll', href: '/payroll', icon: PoundSterling, adminOnly: true },
          { name: 'Team', href: '/users', icon: Users, adminOnly: true },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/20 text-slate-950 font-black tracking-wider text-xl group-hover:scale-105 transition-transform">
              LB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  LB Staff Manager
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                  Plant & Civils
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Construction Labour & Plant CRM</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {item.name}
                {item.adminOnly && (
                  <span className="ml-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Role Switcher & User Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-900/80 p-1 border border-white/10 text-xs">
            <button
              onClick={() => handleRoleToggle('admin')}
              disabled={isPending}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                currentRole === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin View
            </button>
            <button
              onClick={() => handleRoleToggle('staff')}
              disabled={isPending}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                currentRole === 'staff'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Staff View
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
              {currentRole === 'admin' ? 'AD' : 'ST'}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-medium text-slate-200">
                {currentRole === 'admin' ? '@admin' : '@staff'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-500" />
                {currentRole}
              </p>
            </div>
            <form action={logoutAction} className="ml-1">
              <button
                type="submit"
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-slate-950/95 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5 text-amber-400" />
                <span>{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
