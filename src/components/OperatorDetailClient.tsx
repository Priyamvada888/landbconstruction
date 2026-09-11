'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  HardHat,
  Phone,
  Mail,
  MapPin,
  Clock,
  Award,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Archive,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Upload,
  FileText,
  X,
  Download,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Operator, Timesheet, Job, UserRole, OperatorDocument, DocumentType } from '@/types/database';
import {
  archiveOperatorAction,
  restoreOperatorAction,
  deleteOperatorAction,
  deleteTimesheetAction,
  uploadOperatorDocumentAction,
  deleteOperatorDocumentAction,
} from '@/lib/actions';
import { QuickLogHoursModal } from '@/components/QuickLogHoursModal';
import { EditOperatorModal } from '@/components/EditOperatorModal';
import { EditTimesheetModal } from '@/components/EditTimesheetModal';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Passport',
  driving_license: 'Driving Licence',
  ticket: 'CPCS / Card',
  other: 'Document',
};

const STATUS_COLORS: Record<string, string> = {
  'Available': 'text-emerald-600',
  'Working': 'text-blue-600',
  'Starting Soon': 'text-amber-600',
  'On Leave': 'text-slate-500',
  'Do Not Use': 'text-rose-600',
};

interface OperatorDetailClientProps {
  operator: Operator;
  timesheets: Timesheet[];
  allJobs: Job[];
  hoursSummary: { weekHours: number; monthHours: number; yearHours: number };
  currentRole: UserRole;
}

// ── Full-screen viewer (image carousel or PDF embed) ──────────────────────────
function DocumentViewer({
  docs,
  initialIndex,
  onClose,
}: {
  docs: OperatorDocument[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const doc = docs[idx];
  const isImage = doc.file_type.startsWith('image/') || doc.file_type.includes('svg');
  const isPdf = doc.file_type === 'application/pdf';

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(docs.length - 1, i + 1));

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/90 flex flex-col"
      onClick={handleBackdrop}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{doc.name}</p>
          <p className="text-white/50 text-xs">{DOC_TYPE_LABELS[doc.document_type]} · {docs.length > 1 ? `${idx + 1} of ${docs.length}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <a
            href={doc.file_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 py-2 relative" onClick={handleBackdrop}>
        {isImage && (
          <img
            src={doc.file_url}
            alt={doc.name}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{ touchAction: 'pinch-zoom' }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {isPdf && (
          <div className="w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Try native embed first */}
            <object
              data={doc.file_url}
              type="application/pdf"
              className="w-full flex-1 rounded-lg"
            >
              {/* Fallback for mobile browsers that don't support PDF embed */}
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <FileText className="w-16 h-16 text-white/30" />
                <p className="text-white/70 text-sm text-center px-8">
                  PDF preview not supported in this browser.
                </p>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  <Download className="w-4 h-4" /> Open PDF
                </a>
              </div>
            </object>
          </div>
        )}
        {!isImage && !isPdf && (
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <FileText className="w-20 h-20 text-white/30" />
            <p className="text-white/70 text-sm">{doc.name}</p>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-colors">
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}

        {/* Prev / Next arrows */}
        {docs.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              disabled={idx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-20 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              disabled={idx === docs.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-20 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip (when multiple docs) */}
      {docs.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          {docs.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}
            >
              {(d.file_type.startsWith('image/') || d.file_type.includes('svg')) ? (
                <img src={d.file_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function OperatorDetailClient({ operator, timesheets, allJobs, hoursSummary, currentRole }: OperatorDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localDocs, setLocalDocs] = useState<OperatorDocument[]>(operator.documents || []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [docType, setDocType] = useState<DocumentType>('passport');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleArchive = () => {
    if (!confirm('Archive this operator? Historical timesheets will be preserved.')) return;
    startTransition(async () => { await archiveOperatorAction(operator.id); });
  };

  const handleRestore = () => {
    startTransition(async () => { await restoreOperatorAction(operator.id); });
  };

  const handleDeleteOperator = () => {
    if (!confirm(`Permanently delete "${operator.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteOperatorAction(operator.id);
      router.push('/operators');
    });
  };

  const handleDeleteTimesheet = (id: string) => {
    if (!confirm('Delete this timesheet entry?')) return;
    startTransition(async () => { await deleteTimesheetAction(id); });
  };

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('doc_name', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
        fd.append('document_type', docType);
        const result = await uploadOperatorDocumentAction(operator.id, fd);
        const newDoc: OperatorDocument = {
          id: result.docId,
          operator_id: operator.id,
          name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          document_type: docType,
          file_url: result.file_url,
          file_type: file.type,
          file_size: file.size,
          created_at: new Date().toISOString(),
        };
        setLocalDocs((prev) => [newDoc, ...prev]);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [operator.id, docType]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleDeleteDoc = (docId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteOperatorDocumentAction(operator.id, docId);
      setLocalDocs((prev) => prev.filter((d) => d.id !== docId));
    });
  };

  const isTicketExpired = (expiryStr: string | null) =>
    expiryStr ? new Date(expiryStr).getTime() < Date.now() : false;
  const isTicketExpiringSoon = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    const t = new Date(expiryStr).getTime();
    return t > Date.now() && t - Date.now() < 30 * 86400000;
  };

  const isImage = (ft: string) => ft.startsWith('image/') || ft.includes('svg');
  const isPdf = (ft: string) => ft === 'application/pdf';

  const formatBytes = (b?: number) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusColor = STATUS_COLORS[operator.availability_status] || 'text-slate-500';

  return (
    <div className="space-y-5 text-slate-800">

      {/* Full-screen document viewer */}
      {viewerIndex !== null && (
        <DocumentViewer
          docs={localDocs}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="border-b border-slate-200/80 pb-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-400">
          <Link href="/operators" className="hover:text-slate-700 font-medium transition-colors">Operators</Link>
          <span>/</span>
          <span className="text-indigo-600 font-medium">{operator.primary_role}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            {/* Name + archive badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{operator.name}</h1>
              {operator.is_archived && (
                <span className="text-xs font-bold text-rose-600">ARCHIVED</span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              <span className={`font-semibold ${statusColor}`}>{operator.availability_status}</span>
              {operator.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{operator.phone}</span>
              )}
              {operator.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{operator.email}</span>
              )}
              {(operator.address || operator.location) && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{operator.address || operator.location}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <EditOperatorModal
              operator={operator}
              currentRole={currentRole}
              triggerLabel="Edit"
              triggerClassName="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
            />
            <QuickLogHoursModal
              operators={[operator]}
              jobs={allJobs}
              defaultOperatorId={operator.id}
              triggerLabel="Log Hours"
              triggerClassName="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
            />
            {operator.is_archived ? (
              <button onClick={handleRestore} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
            ) : (
              <button onClick={handleArchive} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors">
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            )}
            <button onClick={handleDeleteOperator} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 text-xs font-bold hover:bg-rose-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Hours Stats ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'This Week', value: hoursSummary.weekHours, color: 'text-slate-900' },
          { label: 'This Month', value: hoursSummary.monthHours, color: 'text-indigo-600' },
          { label: 'This Year', value: hoursSummary.yearHours, color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-sm">
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-lg sm:text-xl font-bold ${s.color} mt-1`}>{s.value.toFixed(1)}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">hours</p>
          </div>
        ))}
      </div>

      {/* ── 2-col layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="space-y-4">

          {/* UK Compliance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> UK Tax & Compliance
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">NI Number (Nino)</span>
                <span className="font-mono font-semibold text-slate-800">{operator.ni_number || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">UTR (CIS)</span>
                <span className="font-mono font-semibold text-slate-800">{operator.utr_number || '—'}</span>
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Award className="w-3.5 h-3.5 text-indigo-500" /> Certifications
            </h2>
            {(operator.tickets || []).length === 0 ? (
              <p className="text-xs text-slate-400">No tickets registered.</p>
            ) : (
              <div className="space-y-2">
                {(operator.tickets || []).map((t) => {
                  const expired = isTicketExpired(t.expiry_date);
                  const expiringSoon = isTicketExpiringSoon(t.expiry_date);
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{t.ticket_type}</p>
                        <p className="text-slate-400 text-[11px]">{t.expiry_date ? `Exp: ${t.expiry_date}` : 'No expiry'}</p>
                      </div>
                      {expired ? (
                        <span className="flex items-center gap-1 text-rose-600 text-[11px] font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Expired
                        </span>
                      ) : expiringSoon ? (
                        <span className="text-amber-600 text-[11px] font-semibold">Expiring soon</span>
                      ) : (
                        <span className="text-emerald-600 text-[11px] font-semibold">Valid</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Banking */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Rates & Banking
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Hourly Rate</span>
                <span className="font-bold text-slate-900">£{Number(operator.hourly_rate).toFixed(2)}/hr</span>
              </div>
              {currentRole === 'admin' ? (
                <>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Daily Rate</span>
                    <span className="font-semibold text-slate-800">£{Number(operator.daily_rate).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">CIS Withholding</span>
                    <span className="font-semibold text-slate-800">{operator.tax_rate_percent}%</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">Bank Details</p>
                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank</span>
                        <span className="font-semibold text-slate-800">{operator.bank_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account</span>
                        <span className="font-mono font-semibold text-slate-800">{operator.bank_account_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Acc. No.</span>
                        <span className="font-mono font-semibold text-slate-800">{operator.bank_account_number || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sort Code</span>
                        <span className="font-mono font-semibold text-slate-800">{operator.bank_sort_code || '—'}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 text-xs flex items-center gap-1.5 py-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Banking restricted to Admin.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 cols */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Documents ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 space-y-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Documents
                  {localDocs.length > 0 && <span className="text-slate-400 font-normal">({localDocs.length})</span>}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Passport · Driving Licence · CPCS Cards · PDFs</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600 focus:outline-none focus:border-slate-400"
                >
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving Licence</option>
                  <option value="ticket">CPCS / CSCS</option>
                  <option value="other">Other</option>
                </select>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading…' : 'Upload'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.length) uploadFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {uploadError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{uploadError}</div>
            )}

            {/* Drop zone / grid */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed transition-colors ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50/40'}`}
            >
              {localDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs gap-2">
                  <Upload className="w-7 h-7 opacity-40" />
                  <p>Drag & drop files here or click Upload</p>
                  <p className="text-[10px]">Supports: JPG · PNG · PDF · SVG</p>
                </div>
              ) : (
                <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {localDocs.map((doc, i) => (
                    <div
                      key={doc.id}
                      className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex sm:flex-col"
                      onClick={() => setViewerIndex(i)}
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-20 sm:w-full sm:h-32 flex-shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center relative">
                        {isImage(doc.file_type) ? (
                          <img
                            src={doc.file_url}
                            alt={doc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : isPdf(doc.file_type) ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-red-50">
                            <FileText className="w-7 h-7 sm:w-9 sm:h-9 text-red-300" />
                            <span className="text-[9px] text-red-400 font-bold mt-0.5 tracking-wider">PDF</span>
                          </div>
                        ) : (
                          <FileText className="w-7 h-7 sm:w-9 sm:h-9 text-slate-300" />
                        )}
                        {/* Zoom overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 px-2.5 py-2 flex flex-col justify-center sm:justify-start">
                        <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight" title={doc.name}>{doc.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-400">{DOC_TYPE_LABELS[doc.document_type]}</span>
                          <span className="text-[10px] text-slate-300">{formatBytes(doc.file_size)}</span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 shadow text-slate-400 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                        title="Delete document"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Timesheets ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Logged Shifts
                  <span className="text-slate-400 font-normal">({timesheets.length})</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Verified timesheet entries with rate snapshots</p>
              </div>
              <QuickLogHoursModal operators={[operator]} jobs={allJobs} defaultOperatorId={operator.id} triggerLabel="+ Log Shift" />
            </div>

            {timesheets.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                No shifts logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left text-xs text-slate-600 min-w-[520px]">
                  <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Site</th>
                      <th className="px-3 py-2.5">Hrs</th>
                      <th className="px-3 py-2.5">Rate</th>
                      <th className="px-3 py-2.5">Gross</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timesheets.map((ts) => {
                      const gross = Number(ts.hours) * Number(ts.rate_applied);
                      return (
                        <tr key={ts.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{ts.date}</td>
                          <td className="px-3 py-3 font-medium text-slate-800 max-w-[180px] truncate">
                            {ts.job ? `${ts.job.client} — ${ts.job.site_name}` : 'Direct'}
                          </td>
                          <td className="px-3 py-3 font-bold text-indigo-600">{ts.hours}h</td>
                          <td className="px-3 py-3 text-slate-500">£{Number(ts.rate_applied).toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-emerald-600">{formatCurrency(gross)}</td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <EditTimesheetModal timesheet={ts} operators={[operator]} jobs={allJobs} />
                              <button
                                onClick={() => handleDeleteTimesheet(ts.id)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      </div>
    </div>
  );
}
