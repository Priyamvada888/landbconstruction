'use client';

import { useState } from 'react';
import {
  Settings,
  FileText,
  Award,
  IdCard,
  Shield,
  ChevronRight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface SettingsClientProps {
  currentRole: UserRole;
}

const TICKET_TYPE_OPTIONS = [
  'Excavator 180', 'Excavator 360', 'ADT', 'Dozer', 'Dumper', 'Roller',
  'Telehandler', 'Loading Shovel', 'CPCS', 'NPORS', 'EUSR', 'CSCS', 'First Aid',
  'Confined Space', 'Slinger/Signaller',
];

const OPERATOR_ROLES = [
  'Excavator Operator', 'ADT Operator', 'Dozer Operator', 'Dumper Operator',
  'Roller Operator', 'Telehandler Operator', 'Groundworker', 'Pipe Layer',
  'General Labourer', 'Other',
];

const DOC_CATEGORIES = [
  { value: 'passport', label: 'Passport', icon: IdCard, description: 'UK or international passport' },
  { value: 'driving_license', label: 'Driving Licence', icon: FileText, description: 'DVLA driving licence' },
  { value: 'ticket', label: 'Tickets & Certifications', icon: Award, description: 'CPCS, CSCS, NPORS, EUSR cards' },
  { value: 'other', label: 'Other Document', icon: FileText, description: 'Any other supporting document' },
];

type SettingsSection = 'document-categories' | 'ticket-types' | 'roles' | 'compliance';

export function SettingsClient({ currentRole }: SettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('document-categories');

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'document-categories',
      label: 'Document Categories',
      icon: <IdCard className="w-4 h-4" />,
      description: 'Passport, Licence & Ticket types',
    },
    {
      id: 'ticket-types',
      label: 'Ticket & Certification Types',
      icon: <Award className="w-4 h-4" />,
      description: 'Manage available operator tickets',
    },
    {
      id: 'roles',
      label: 'Operator Roles',
      icon: <FileText className="w-4 h-4" />,
      description: 'Available plant operator roles',
    },
    {
      id: 'compliance',
      label: 'Compliance & Privacy',
      icon: <Shield className="w-4 h-4" />,
      description: 'GDPR, data retention & security',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-5">
        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">Document categories, ticket types, operator roles &amp; compliance options</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Left sidebar nav */}
        <div className="lg:col-span-1 space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-xs font-semibold ${
                activeSection === s.id
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className={`${activeSection === s.id ? 'text-indigo-600' : 'text-slate-400'} transition-colors`}>
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate">{s.label}</p>
                <p className={`text-[10px] font-normal truncate mt-0.5 ${activeSection === s.id ? 'text-slate-500' : 'text-slate-400'}`}>
                  {s.description}
                </p>
              </div>
              {activeSection === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* Right content panel */}
        <div className="lg:col-span-3">

          {/* ── Document Categories ── */}
          {activeSection === 'document-categories' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Document Categories</h2>
                <p className="text-xs text-slate-400 mt-0.5">The document types available when uploading operator documents. Each category is stored separately for easy filtering and compliance review.</p>
              </div>

              <div className="space-y-3">
                {DOC_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.value}
                      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900">{cat.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{cat.value}</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Active</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="text-indigo-700">
                  <p className="font-semibold mb-0.5">About Document Categories</p>
                  <p>Documents are stored in separate categories so you can quickly see which operators have valid passports, current driving licences, or up-to-date CPCS/CSCS cards. This is essential for site compliance checks.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Ticket Types ── */}
          {activeSection === 'ticket-types' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Ticket &amp; Certification Types</h2>
                <p className="text-xs text-slate-400 mt-0.5">Standard certifications available when registering operators. Custom tickets can also be added on-the-fly in the operator form.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TICKET_TYPE_OPTIONS.map((ticket) => (
                  <div
                    key={ticket}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{ticket}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Custom Tickets</p>
                <p className="text-[11px] text-slate-400 mb-3">
                  In addition to the standard list above, users can add custom tickets when creating or editing operators (e.g. Hiab, SSSTS, SMSTS, Asbestos Awareness). These are stored per-operator and display automatically.
                </p>
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-xs">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700">Custom ticket types entered in operator forms are saved directly against that operator and will persist. They can be removed individually using the delete button in the operator&apos;s Certifications card.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Operator Roles ── */}
          {activeSection === 'roles' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Operator Roles</h2>
                <p className="text-xs text-slate-400 mt-0.5">The plant operator roles used for matching operators to job sites and tracking headcount by role type.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OPERATOR_ROLES.map((role) => (
                  <div
                    key={role}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {role[0]}
                    </div>
                    <span className="font-semibold text-slate-800">{role}</span>
                    <span className="ml-auto text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Active</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <p className="text-indigo-700">Operator roles determine which jobs an operator is matched to. When creating a job site, you can specify multiple roles with individual headcounts (e.g. 4x ADT Operator, 2x Dozer Operator). The system uses these roles to suggest the right candidates.</p>
              </div>
            </div>
          )}

          {/* ── Compliance ── */}
          {activeSection === 'compliance' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Compliance &amp; Privacy</h2>
                <p className="text-xs text-slate-400 mt-0.5">GDPR settings and data management options for UK construction recruitment.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> GDPR &amp; Data Retention
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Data Retention Period</label>
                      <select defaultValue="3" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-400 focus:outline-none">
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years</option>
                        <option value="5">5 Years</option>
                        <option value="7">7 Years (HMRC Recommended)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Archived Operator Retention</label>
                      <select defaultValue="12" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-400 focus:outline-none">
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'NI Numbers encrypted at rest', status: 'enabled' },
                    { label: 'Bank details restricted to Admin role only', status: 'enabled' },
                    { label: 'Password hashing (bcrypt)', status: 'enabled' },
                    { label: 'Role-based access control (RBAC)', status: 'enabled' },
                    { label: 'Session-based authentication (JWT)', status: 'enabled' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-xs">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700">For GDPR Subject Access Requests or data deletion requests, contact your system administrator. All operator personal data (NI numbers, bank details, contact info) is stored securely and accessible only to authorised users.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
