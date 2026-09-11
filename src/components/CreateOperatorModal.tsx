'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { Plus, X, HardHat, CreditCard, ShieldCheck, Upload, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { OperatorRole, AvailabilityStatus, TicketType, UserRole, DocumentType } from '@/types/database';
import { createOperatorAction, uploadOperatorDocumentAction } from '@/lib/actions';

const ROLES: OperatorRole[] = [
  'Excavator Operator', 'ADT Operator', 'Dozer Operator', 'Dumper Operator',
  'Roller Operator', 'Telehandler Operator', 'Groundworker', 'Pipe Layer',
  'General Labourer', 'Other',
];

const AVAILABILITIES: AvailabilityStatus[] = [
  'Available', 'Working', 'Starting Soon', 'On Leave', 'Do Not Use',
];

const TICKET_TYPES: TicketType[] = [
  'Excavator 180', 'Excavator 360', 'ADT', 'Dozer', 'Dumper', 'Roller',
  'Telehandler', 'CPCS', 'NPORS', 'EUSR', 'CSCS', 'First Aid',
  'Confined Space', 'Slinger/Signaller',
];

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'ticket', label: 'CPCS / CSCS Card' },
  { value: 'other', label: 'Other Document' },
];

interface PendingDoc {
  file: File;
  doc_name: string;
  document_type: DocumentType;
  preview?: string;
}

interface CreateOperatorModalProps {
  currentRole: UserRole;
}

export function CreateOperatorModal({ currentRole }: CreateOperatorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<TicketType[]>(['CSCS']);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDocType, setNewDocType] = useState<DocumentType>('passport');

  const handleToggleTicket = (ticket: TicketType) => {
    if (selectedTickets.includes(ticket)) {
      setSelectedTickets(selectedTickets.filter((t) => t !== ticket));
    } else {
      setSelectedTickets([...selectedTickets, ticket]);
    }
  };

  const handleAddFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newDocs: PendingDoc[] = arr.map((file) => {
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : undefined;
      return {
        file,
        doc_name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        document_type: newDocType,
        preview,
      };
    });
    setPendingDocs((prev) => [...prev, ...newDocs]);
  }, [newDocType]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleAddFiles(e.dataTransfer.files);
  };

  const handleRemoveDoc = (idx: number) => {
    setPendingDocs((prev) => {
      const updated = [...prev];
      if (updated[idx].preview) URL.revokeObjectURL(updated[idx].preview!);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createOperatorAction(formData);
        const operatorId = result.operator?.id;

        // Upload pending documents after creating the operator
        if (operatorId && pendingDocs.length > 0) {
          await Promise.all(
            pendingDocs.map(async (doc) => {
              const df = new FormData();
              df.append('file', doc.file);
              df.append('doc_name', doc.doc_name);
              df.append('document_type', doc.document_type);
              await uploadOperatorDocumentAction(operatorId, df).catch(console.error);
            })
          );
        }

        setIsOpen(false);
        form.reset();
        setPendingDocs([]);
        setSelectedTickets(['CSCS']);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to register operator');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Add Operator</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] text-slate-900 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Register Plant Operator</h2>
                  <p className="text-[11px] text-slate-400">Add worker profile, UK compliance, documents & rates</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form id="create-op-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── 1. Basic Contact ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Personal Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input type="text" name="name" required placeholder="e.g. John Campbell"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input type="text" name="phone" placeholder="e.g. 07700 900123"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input type="email" name="email" placeholder="e.g. john@email.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                    <input type="text" name="address" placeholder="e.g. 10 High Street, SS16 6RE, Basildon"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* ── 2. UK Compliance ── */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> 2. UK Tax & Compliance
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">NI Number (Nino)</label>
                    <input type="text" name="ni_number" placeholder="e.g. ST877652A"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">UTR Number (CIS)</label>
                    <input type="text" name="utr_number" placeholder="e.g. 78505 88349"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none font-mono" />
                  </div>
                </div>
              </div>

              {/* ── 3. Role & Experience ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3. Trade & Availability</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Role *</label>
                    <select name="primary_role" required defaultValue="Excavator Operator"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Years Exp</label>
                    <input type="number" name="experience_years" min="0" defaultValue="5"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Company</label>
                    <input type="text" name="current_company" placeholder="e.g. Balfour Beatty / Self-Employed"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Availability</label>
                    <select name="availability_status" defaultValue="Available"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none">
                      {AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── 4. Tickets ── */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">4. Tickets & Certifications</p>
                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  {TICKET_TYPES.map((t) => {
                    const isSelected = selectedTickets.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => handleToggleTicket(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${isSelected ? 'bg-[#6366f1] text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
                {selectedTickets.map((t) => <input key={t} type="hidden" name="tickets" value={t} />)}
              </div>

              {/* ── 5. Bank Details (Admin) ── */}
              {currentRole === 'admin' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> 5. Rates & Bank Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate (£) *</label>
                      <input type="number" step="0.5" min="0" name="hourly_rate" defaultValue="24.00" required
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6366f1] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Rate (£)</label>
                      <input type="number" step="5.0" min="0" name="daily_rate" defaultValue="220.00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6366f1] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Rate % (CIS)</label>
                      <input type="number" step="1" min="0" max="100" name="tax_rate_percent" defaultValue="20"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6366f1] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                      <input type="text" name="bank_name" placeholder="e.g. HSBC, Barclays"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#6366f1] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name</label>
                      <input type="text" name="bank_account_name" placeholder="Full legal name"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#6366f1] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                      <input type="text" name="bank_account_number" placeholder="e.g. 74164172"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#6366f1] focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sort Code</label>
                      <input type="text" name="bank_sort_code" placeholder="e.g. 40-09-00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#6366f1] focus:outline-none font-mono" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── 6. Documents ── */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">6. Identity Documents (Passport, Licence, Tickets)</p>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                  >
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <button type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Add File
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => { if (e.target.files?.length) handleAddFiles(e.target.files); e.target.value = ''; }} />
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed p-4 text-center text-xs transition-colors ${isDragging ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                >
                  {pendingDocs.length === 0
                    ? <><Upload className="w-5 h-5 mx-auto mb-1 opacity-50" /> Drag &amp; drop Passport / Driving Licence / PDFs here, or click &quot;Add File&quot;</>
                    : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
                        {pendingDocs.map((doc, idx) => (
                          <div key={idx} className="relative rounded-xl border border-slate-200 bg-white p-2 flex flex-col gap-1">
                            {doc.preview
                              ? <img src={doc.preview} alt="" className="w-full h-20 object-cover rounded-lg" />
                              : <div className="w-full h-20 flex items-center justify-center bg-slate-100 rounded-lg">
                                <FileText className="w-8 h-8 text-slate-400" />
                              </div>
                            }
                            <input
                              type="text"
                              value={doc.doc_name}
                              onChange={(e) => setPendingDocs(prev => prev.map((d, i) => i === idx ? { ...d, doc_name: e.target.value } : d))}
                              className="w-full text-[10px] text-slate-700 font-medium bg-transparent border-b border-slate-200 focus:outline-none truncate"
                            />
                            <span className="text-[9px] text-slate-400">{DOC_TYPES.find(d => d.value === doc.document_type)?.label}</span>
                            <button type="button" onClick={() => handleRemoveDoc(idx)}
                              className="absolute top-1.5 right-1.5 p-0.5 rounded bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
              <span className="text-[11px] text-slate-400">{pendingDocs.length > 0 ? `${pendingDocs.length} document(s) will be uploaded` : 'No documents attached'}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors">
                  Cancel
                </button>
                <button type="submit" form="create-op-form" disabled={isPending}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all active:scale-95">
                  {isPending ? 'Saving...' : 'Register Operator'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
