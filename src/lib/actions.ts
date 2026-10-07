'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { DataStore } from './store';
import { JobStatus, OperatorRole, AvailabilityStatus, TicketType, UserRole, Job, Profile, DocumentType, JobRoleRequirement } from '@/types/database';
import { hashPassword, signJwt, verifyJwt, COOKIE_NAME } from './jwt';
import { getSupabaseAdmin } from './supabase/admin';

async function getEffectiveRole(): Promise<UserRole> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const payload = verifyJwt(token);
      if (payload?.role) return payload.role;
    }
  } catch {
    // ignore
  }
  return DataStore.getSessionRole();
}

export async function checkAdminPermission() {
  const role = await getEffectiveRole();
  if (role !== 'admin') {
    throw new Error('Access denied: Action requires Administrator privileges.');
  }
}

export async function toggleRoleAction(newRole: UserRole) {
  DataStore.setSessionRole(newRole);
  revalidatePath('/', 'layout');
  return { success: true, role: newRole };
}

// JOBS ACTIONS
export async function createJobAction(formData: FormData) {
  const client = formData.get('client')?.toString().trim();
  const site_name = formData.get('site_name')?.toString().trim();
  const postcode = formData.get('postcode')?.toString().trim() || null;
  const start_date = formData.get('start_date')?.toString() || new Date().toISOString().split('T')[0];
  const end_date = formData.get('end_date')?.toString() || null;
  const rawPay = parseFloat(formData.get('pay_rate')?.toString() || '0');
  const pay_rate = Number.isNaN(rawPay) ? 0 : rawPay;
  const rawCharge = parseFloat(formData.get('charge_rate')?.toString() || '0');
  const charge_rate = Number.isNaN(rawCharge) ? 0 : rawCharge;
  const site_contact_name = formData.get('site_contact_name')?.toString().trim() || null;
  const site_contact_phone = formData.get('site_contact_phone')?.toString().trim() || null;
  const notes = formData.get('notes')?.toString().trim() || null;

  const rawRoles = formData.get('role_requirements')?.toString();
  let role_requirements: JobRoleRequirement[] | undefined;
  if (rawRoles) {
    try {
      role_requirements = JSON.parse(rawRoles);
    } catch (e) {
      // ignore
    }
  }

  let required_operator_count = parseInt(formData.get('required_operator_count')?.toString() || '1', 10);
  let required_role = formData.get('required_role')?.toString() as OperatorRole;

  if (role_requirements && role_requirements.length > 0) {
    required_operator_count = role_requirements.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
    if (!required_role || required_role === '' as OperatorRole) {
      required_role = role_requirements[0].role;
    }
  }

  if (!client || !site_name || !required_role) {
    throw new Error('Client name, site name, and required role are required.');
  }

  if (pay_rate < 0 || charge_rate < 0) {
    throw new Error('Pay rate and charge rate cannot be negative.');
  }

  if (required_operator_count <= 0) {
    throw new Error('Required operator count must be at least 1.');
  }

  const jobId = crypto.randomUUID();
  const supabase = getSupabaseAdmin();

  const notesForSupabase = role_requirements && role_requirements.length > 0
    ? `${notes || ''}\n<!--ROLES:${JSON.stringify(role_requirements)}-->`.trim()
    : notes;

  if (supabase) {
    const { error: dbErr } = await supabase.from('jobs').insert({
      id: jobId,
      client,
      site_name,
      postcode,
      start_date,
      end_date,
      required_operator_count,
      required_role,
      pay_rate,
      charge_rate,
      site_contact_name,
      site_contact_phone,
      notes: notesForSupabase,
      status: 'Draft',
      is_archived: false,
    });
    if (dbErr) {
      console.error('Supabase job insert error:', dbErr);
    }
  }

  const job = DataStore.createJob({
    id: jobId,
    client,
    site_name,
    postcode,
    start_date,
    end_date,
    required_operator_count,
    required_role,
    role_requirements,
    pay_rate,
    charge_rate,
    site_contact_name,
    site_contact_phone,
    notes,
    status: 'Draft',
  });

  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  return { success: true, job };
}

export async function updateJobStatusAction(jobId: string, status: JobStatus) {
  const validStatuses: JobStatus[] = ['Draft', 'Filled', 'In Progress', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status specified.');
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (dbErr) console.error('Supabase job status update error:', dbErr);
  }

  const updated = DataStore.updateJob(jobId, { status });
  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  return { success: true, job: updated };
}

export async function updateJobAction(id: string, formData: FormData) {
  const client = formData.get('client')?.toString().trim();
  const site_name = formData.get('site_name')?.toString().trim();
  const postcode = formData.get('postcode')?.toString().trim() || null;
  const start_date = formData.get('start_date')?.toString();
  const end_date = formData.get('end_date')?.toString() || null;
  const rawPay = parseFloat(formData.get('pay_rate')?.toString() || '0');
  const pay_rate = Number.isNaN(rawPay) ? 0 : rawPay;
  const rawCharge = parseFloat(formData.get('charge_rate')?.toString() || '0');
  const charge_rate = Number.isNaN(rawCharge) ? 0 : rawCharge;
  const site_contact_name = formData.get('site_contact_name')?.toString().trim() || null;
  const site_contact_phone = formData.get('site_contact_phone')?.toString().trim() || null;
  const notes = formData.get('notes')?.toString().trim() || null;
  const status = formData.get('status')?.toString() as JobStatus | undefined;

  const rawRoles = formData.get('role_requirements')?.toString();
  let role_requirements: JobRoleRequirement[] | undefined;
  if (rawRoles) {
    try {
      role_requirements = JSON.parse(rawRoles);
    } catch (e) {
      // ignore
    }
  }

  let required_operator_count = parseInt(formData.get('required_operator_count')?.toString() || '1', 10);
  let required_role = formData.get('required_role')?.toString() as OperatorRole;

  if (role_requirements && role_requirements.length > 0) {
    required_operator_count = role_requirements.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
    if (!required_role || required_role === '' as OperatorRole) {
      required_role = role_requirements[0].role;
    }
  }

  if (!client || !site_name || !required_role) {
    throw new Error('Client name, site name, and required role are required.');
  }

  if (pay_rate < 0 || charge_rate < 0) {
    throw new Error('Pay rate and charge rate cannot be negative.');
  }

  if (required_operator_count <= 0) {
    throw new Error('Required operator count must be at least 1.');
  }

  const updates: Partial<Job> = {
    client,
    site_name,
    postcode,
    required_operator_count,
    required_role,
    pay_rate,
    charge_rate,
    site_contact_name,
    site_contact_phone,
    notes,
  };

  if (role_requirements) updates.role_requirements = role_requirements;
  if (start_date) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (status) updates.status = status;

  const notesForSupabase = role_requirements && role_requirements.length > 0
    ? `${notes || ''}\n<!--ROLES:${JSON.stringify(role_requirements)}-->`.trim()
    : notes;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { role_requirements: _rr, ...dbJobUpdates } = updates;
    const { error: dbErr } = await supabase.from('jobs').update({
      ...dbJobUpdates,
      notes: notesForSupabase,
    }).eq('id', id);
    if (dbErr) console.error('Supabase job update error:', dbErr);
  }

  const updated = DataStore.updateJob(id, updates);
  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  revalidatePath(`/jobs/${id}`);
  return { success: true, job: updated };
}

export async function deleteJobAction(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('job_assignments').delete().eq('job_id', id);
    await supabase.from('jobs').delete().eq('id', id);
  }

  const ok = DataStore.deleteJob(id);
  if (!ok) throw new Error('Job not found or already removed');

  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  return { success: true };
}

export async function assignOperatorAction(jobId: string, operatorId: string, assignedRole?: OperatorRole, startDate?: string | null) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('job_assignments').insert({
      job_id: jobId,
      operator_id: operatorId,
    });
    if (dbErr) console.error('Supabase assignment error:', dbErr);
  }

  const updatedJob = DataStore.assignOperatorToJob(jobId, operatorId, assignedRole, startDate);

  if (supabase && updatedJob.status) {
    await supabase.from('jobs').update({ status: updatedJob.status }).eq('id', jobId);
  }

  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/operators/${operatorId}`);
  return { success: true, job: updatedJob };
}

export async function unassignOperatorAction(jobId: string, operatorId: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase
      .from('job_assignments')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .eq('operator_id', operatorId)
      .is('unassigned_at', null);
    if (dbErr) console.error('Supabase unassign error:', dbErr);
  }

  const updatedJob = DataStore.unassignOperatorFromJob(jobId, operatorId);

  if (supabase && updatedJob.status) {
    await supabase.from('jobs').update({ status: updatedJob.status }).eq('id', jobId);
  }

  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/operators/${operatorId}`);
  return { success: true, job: updatedJob };
}

// Standard tickets matching the PostgreSQL ticket_type enum in Supabase
const SUPABASE_ENUM_TICKETS = new Set([
  'Excavator 180',
  'Excavator 360',
  'ADT',
  'Dozer',
  'Dumper',
  'Roller',
  'Telehandler',
  'CPCS',
  'NPORS',
  'EUSR',
  'CSCS',
  'First Aid',
  'Confined Space',
  'Slinger/Signaller',
]);

// OPERATORS ACTIONS
export async function createOperatorAction(formData: FormData) {
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim() || null;
  const email = formData.get('email')?.toString().trim() || null;
  const primary_role = formData.get('primary_role')?.toString() as OperatorRole;
  const address = formData.get('address')?.toString().trim() || null;
  const location = address; // keep in sync
  const ni_number = formData.get('ni_number')?.toString().trim() || null;
  const utr_number = formData.get('utr_number')?.toString().trim() || null;
  const rawExp = parseInt(formData.get('experience_years')?.toString() || '0', 10);
  const experience_years = Number.isNaN(rawExp) ? 0 : rawExp;
  const current_company = formData.get('current_company')?.toString().trim() || null;
  const availability_status = (formData.get('availability_status')?.toString() || 'Available') as AvailabilityStatus;
  const rawHourly = parseFloat(formData.get('hourly_rate')?.toString() || '0');
  const hourly_rate = Number.isNaN(rawHourly) ? 0 : rawHourly;
  const rawDaily = parseFloat(formData.get('daily_rate')?.toString() || '0');
  const daily_rate = Number.isNaN(rawDaily) ? 0 : rawDaily;
  const rawTax = parseFloat(formData.get('tax_rate_percent')?.toString() || '20');
  const tax_rate_percent = Number.isNaN(rawTax) ? 20 : rawTax;

  // Bank details (only admin can assign bank details)
  const role = await getEffectiveRole();
  let bank_name = null;
  let bank_account_name = null;
  let bank_account_number = null;
  let bank_sort_code = null;

  if (role === 'admin') {
    bank_name = formData.get('bank_name')?.toString().trim() || null;
    bank_account_name = formData.get('bank_account_name')?.toString().trim() || null;
    bank_account_number = formData.get('bank_account_number')?.toString().trim() || null;
    bank_sort_code = formData.get('bank_sort_code')?.toString().trim() || null;
  }

  if (!name || !primary_role) {
    throw new Error('Operator name and primary role are required.');
  }

  if (hourly_rate < 0 || daily_rate < 0 || tax_rate_percent < 0 || experience_years < 0) {
    throw new Error('Numeric values cannot be negative.');
  }

  const opId = crypto.randomUUID();

  // Parse tickets deduplicated
  const rawTicketEntries = Array.from(new Set(
    formData.getAll('tickets')
      .map((t) => t.toString().trim())
      .filter(Boolean)
  )) as TicketType[];

  const tickets = rawTicketEntries.map((t, index) => ({
    id: `ticket-${Date.now()}-${index}`,
    operator_id: opId,
    ticket_type: t,
    expiry_date: formData.get(`ticket_expiry_${t}`)?.toString() || null,
  }));

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('operators').insert({
      id: opId,
      name,
      phone,
      email,
      primary_role,
      location,
      address,
      ni_number,
      utr_number,
      experience_years,
      current_company,
      availability_status,
      hourly_rate,
      daily_rate,
      tax_rate_percent,
      bank_name,
      bank_account_name,
      bank_account_number,
      bank_sort_code,
      is_archived: false,
    });
    if (dbErr) {
      console.error('Supabase operator insert error:', dbErr);
    } else if (tickets.length > 0) {
      const enumTickets = tickets.filter((tk) => SUPABASE_ENUM_TICKETS.has(tk.ticket_type));
      const customTickets = tickets.filter((tk) => !SUPABASE_ENUM_TICKETS.has(tk.ticket_type));

      if (enumTickets.length > 0) {
        const { error: tErr } = await supabase.from('operator_tickets').insert(
          enumTickets.map((tk) => ({
            operator_id: opId,
            ticket_type: tk.ticket_type,
            expiry_date: tk.expiry_date || null,
          }))
        );
        if (tErr) console.error('Supabase operator tickets insert error:', tErr);
      }

      if (customTickets.length > 0) {
        const { error: cErr } = await supabase.from('operator_documents').insert(
          customTickets.map((tk) => ({
            operator_id: opId,
            name: `Custom Ticket: ${tk.ticket_type}`,
            document_type: 'ticket',
            file_url: `custom_ticket://${encodeURIComponent(tk.ticket_type)}`,
            file_type: 'custom_ticket',
          }))
        );
        if (cErr) console.error('Supabase custom tickets insert error:', cErr);
      }
    }
  }

  const op = DataStore.createOperator({
    id: opId,
    name,
    phone,
    email,
    primary_role,
    location,
    address,
    ni_number,
    utr_number,
    experience_years,
    current_company,
    availability_status,
    hourly_rate,
    daily_rate,
    tax_rate_percent,
    bank_name,
    bank_account_name,
    bank_account_number,
    bank_sort_code,
    tickets,
  });

  revalidatePath('/operators');
  revalidatePath('/dashboard');
  return { success: true, operator: op };
}

export async function updateOperatorAction(id: string, formData: FormData) {
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim() || null;
  const email = formData.get('email')?.toString().trim() || null;
  const primary_role = formData.get('primary_role')?.toString() as OperatorRole;
  const address = formData.get('address')?.toString().trim() || null;
  const location = address;
  const ni_number = formData.get('ni_number')?.toString().trim() || null;
  const utr_number = formData.get('utr_number')?.toString().trim() || null;
  const rawExp = parseInt(formData.get('experience_years')?.toString() || '0', 10);
  const experience_years = Number.isNaN(rawExp) ? 0 : rawExp;
  const current_company = formData.get('current_company')?.toString().trim() || null;
  const availability_status = (formData.get('availability_status')?.toString() || 'Available') as AvailabilityStatus;

  const role = await getEffectiveRole();
  const updates: Record<string, unknown> = {
    name,
    phone,
    email,
    primary_role,
    location,
    address,
    ni_number,
    utr_number,
    experience_years,
    current_company,
    availability_status,
  };

  // Only admin can update rates and bank details
  if (role === 'admin') {
    if (formData.has('hourly_rate')) {
      const val = parseFloat(formData.get('hourly_rate')!.toString());
      updates.hourly_rate = Number.isNaN(val) ? 0 : Math.max(0, val);
    }
    if (formData.has('daily_rate')) {
      const val = parseFloat(formData.get('daily_rate')!.toString());
      updates.daily_rate = Number.isNaN(val) ? 0 : Math.max(0, val);
    }
    if (formData.has('tax_rate_percent')) {
      const val = parseFloat(formData.get('tax_rate_percent')!.toString());
      updates.tax_rate_percent = Number.isNaN(val) ? 20 : Math.max(0, val);
    }
    if (formData.has('bank_name')) updates.bank_name = formData.get('bank_name')?.toString().trim() || null;
    if (formData.has('bank_account_name')) updates.bank_account_name = formData.get('bank_account_name')?.toString().trim() || null;
    if (formData.has('bank_account_number')) updates.bank_account_number = formData.get('bank_account_number')?.toString().trim() || null;
    if (formData.has('bank_sort_code')) updates.bank_sort_code = formData.get('bank_sort_code')?.toString().trim() || null;
  }

  const rawTickets = Array.from(new Set(
    formData.getAll('tickets')
      .map((t) => t.toString().trim())
      .filter(Boolean)
  ));
  const tickets = rawTickets.map((t) => ({
    id: crypto.randomUUID(),
    operator_id: id,
    ticket_type: t as TicketType,
    expiry_date: null,
  }));
  if (formData.has('tickets') || rawTickets.length > 0) {
    updates.tickets = tickets;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { tickets: _t, ...scalarUpdates } = updates;
    const { error: dbErr } = await supabase.from('operators').update(scalarUpdates).eq('id', id);
    if (dbErr) console.error('Supabase operator update error:', dbErr);

    if (formData.has('tickets') || rawTickets.length > 0) {
      // Clean up previous operator_tickets and custom ticket documents
      await supabase.from('operator_tickets').delete().eq('operator_id', id);
      await supabase.from('operator_documents').delete().eq('operator_id', id).eq('file_type', 'custom_ticket');

      const enumTickets = tickets.filter((tk) => SUPABASE_ENUM_TICKETS.has(tk.ticket_type));
      const customTickets = tickets.filter((tk) => !SUPABASE_ENUM_TICKETS.has(tk.ticket_type));

      if (enumTickets.length > 0) {
        const { error: tErr } = await supabase.from('operator_tickets').insert(
          enumTickets.map((tk) => ({
            operator_id: id,
            ticket_type: tk.ticket_type,
            expiry_date: null,
          }))
        );
        if (tErr) console.error('Supabase operator tickets update error:', tErr);
      }

      if (customTickets.length > 0) {
        const { error: cErr } = await supabase.from('operator_documents').insert(
          customTickets.map((tk) => ({
            operator_id: id,
            name: `Custom Ticket: ${tk.ticket_type}`,
            document_type: 'ticket',
            file_url: `custom_ticket://${encodeURIComponent(tk.ticket_type)}`,
            file_type: 'custom_ticket',
          }))
        );
        if (cErr) console.error('Supabase custom tickets update error:', cErr);
      }
    }
  }

  const updated = DataStore.updateOperator(id, updates);
  revalidatePath('/operators');
  revalidatePath(`/operators/${id}`);
  return { success: true, operator: updated };
}

// DOCUMENT ACTIONS — upload to Supabase Storage bucket 'operator-documents'
export async function uploadOperatorDocumentAction(operatorId: string, formData: FormData) {
  const file = formData.get('file') as File | null;
  const docName = formData.get('doc_name')?.toString().trim() || file?.name || 'Unnamed Document';
  const document_type = (formData.get('document_type')?.toString() || 'other') as DocumentType;

  if (!file || file.size === 0) throw new Error('No file provided.');

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available.');

  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `${operatorId}/${crypto.randomUUID()}.${ext}`;

  // Upload file bytes to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from('operator-documents')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error('Supabase storage upload error:', uploadErr);
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('operator-documents')
    .getPublicUrl(storagePath);

  const file_url = urlData.publicUrl;

  // Insert doc record into operator_documents table
  const docId = crypto.randomUUID();
  const dbDocType = document_type === 'id' ? 'passport' : document_type;
  const { error: dbErr } = await supabase.from('operator_documents').insert({
    id: docId,
    operator_id: operatorId,
    name: docName,
    document_type: dbDocType,
    file_url,
    file_type: file.type,
    file_size: file.size,
    storage_path: storagePath,
  });
  if (dbErr) {
    console.error('Supabase doc insert error:', dbErr);
    throw new Error(`Failed to save document record: ${dbErr.message}`);
  }

  // Also update in-memory store
  DataStore.addOperatorDocument(operatorId, {
    id: docId,
    name: docName,
    document_type,
    file_url,
    file_type: file.type,
    file_size: file.size,
  });

  revalidatePath(`/operators/${operatorId}`);
  return { success: true, docId, file_url };
}

export async function deleteOperatorDocumentAction(operatorId: string, docId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available.');

  // Get storage path before deletion
  const { data: docRow } = await supabase
    .from('operator_documents')
    .select('storage_path')
    .eq('id', docId)
    .single();

  // Delete from storage if we have a path
  if (docRow?.storage_path) {
    await supabase.storage.from('operator-documents').remove([docRow.storage_path]);
  }

  // Delete from DB
  await supabase.from('operator_documents').delete().eq('id', docId);

  // Delete from in-memory store
  DataStore.deleteOperatorDocument(operatorId, docId);

  revalidatePath(`/operators/${operatorId}`);
  return { success: true };
}

export async function addOperatorTicketAction(operatorId: string, ticketType: string, expiryDate?: string | null) {
  const trimmed = ticketType.trim();
  if (!trimmed) throw new Error('Ticket type is required.');

  const supabase = getSupabaseAdmin();
  let ticketId = crypto.randomUUID();

  if (supabase) {
    if (SUPABASE_ENUM_TICKETS.has(trimmed)) {
      const { data, error } = await supabase.from('operator_tickets').insert({
        operator_id: operatorId,
        ticket_type: trimmed,
        expiry_date: expiryDate || null,
      }).select().single();
      if (error) console.error('Error adding operator ticket:', error);
      if (data?.id) ticketId = data.id;
    } else {
      const { data, error } = await supabase.from('operator_documents').insert({
        operator_id: operatorId,
        name: `Custom Ticket: ${trimmed}`,
        document_type: 'ticket',
        file_url: `custom_ticket://${encodeURIComponent(trimmed)}`,
        file_type: 'custom_ticket',
      }).select().single();
      if (error) console.error('Error adding custom ticket doc:', error);
      if (data?.id) ticketId = data.id;
    }
  }

  const op = DataStore.getOperatorById(operatorId);
  if (op) {
    op.tickets = op.tickets || [];
    if (!op.tickets.some((t) => t.ticket_type.toLowerCase() === trimmed.toLowerCase())) {
      op.tickets.push({
        id: ticketId,
        operator_id: operatorId,
        ticket_type: trimmed,
        expiry_date: expiryDate || null,
        created_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath(`/operators/${operatorId}`);
  revalidatePath('/operators');
  return { success: true, ticket: { id: ticketId, operator_id: operatorId, ticket_type: trimmed, expiry_date: expiryDate || null } };
}

export async function deleteOperatorTicketAction(operatorId: string, ticketId: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    // Delete from operator_tickets (standard enum tickets)
    await supabase.from('operator_tickets').delete().eq('id', ticketId);
    // Also delete from operator_documents if it was a custom ticket
    await supabase.from('operator_documents').delete().eq('id', ticketId);

    // Also check by ticket_type if ticketId was synthetic
    const op = DataStore.getOperatorById(operatorId);
    const targetTicket = op?.tickets?.find((t) => t.id === ticketId);
    if (targetTicket) {
      if (SUPABASE_ENUM_TICKETS.has(targetTicket.ticket_type)) {
        await supabase.from('operator_tickets').delete().eq('operator_id', operatorId).eq('ticket_type', targetTicket.ticket_type);
      } else {
        await supabase.from('operator_documents').delete().eq('operator_id', operatorId).eq('file_url', `custom_ticket://${encodeURIComponent(targetTicket.ticket_type)}`);
      }
    }
  }

  // Remove from in-memory store
  const op = DataStore.getOperatorById(operatorId);
  if (op && op.tickets) {
    op.tickets = op.tickets.filter((t) => t.id !== ticketId);
  }

  revalidatePath(`/operators/${operatorId}`);
  revalidatePath('/operators');
  return { success: true };
}

export async function archiveOperatorAction(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('operators').update({ is_archived: true }).eq('id', id);
  }

  const archived = DataStore.archiveOperator(id);
  revalidatePath('/operators');
  revalidatePath('/dashboard');
  return { success: true, operator: archived };
}

export async function restoreOperatorAction(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('operators').update({ is_archived: false }).eq('id', id);
  }

  const restored = DataStore.restoreOperator(id);
  revalidatePath('/operators');
  return { success: true, operator: restored };
}

export async function deleteOperatorAction(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('operator_tickets').delete().eq('operator_id', id);
    await supabase.from('job_assignments').delete().eq('operator_id', id);
    await supabase.from('operators').delete().eq('id', id);
  }

  const ok = DataStore.deleteOperator(id);
  if (!ok) throw new Error('Operator not found or already removed');

  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/operators');
  revalidatePath('/dashboard');
  return { success: true };
}

// TIMESHEETS ACTIONS
export async function logTimesheetAction(formData: FormData) {
  const operator_id = formData.get('operator_id')?.toString();
  const job_id = formData.get('job_id')?.toString() || null;
  const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
  const end_date = formData.get('end_date')?.toString() || null;
  const hours = parseFloat(formData.get('hours')?.toString() || '0');
  let notes = formData.get('notes')?.toString().trim() || null;

  if (!operator_id) {
    throw new Error('Operator is required.');
  }

  const isPeriod = Boolean(end_date && end_date !== date);
  const maxAllowed = isPeriod ? 168 : 24;

  if (hours <= 0 || hours > maxAllowed) {
    throw new Error(`Hours must be between 0.25 and ${maxAllowed}.`);
  }

  if (isPeriod) {
    const periodTag = `[Period: ${date} to ${end_date}]`;
    notes = notes ? `${periodTag} ${notes}` : periodTag;
  }

  const tsId = crypto.randomUUID();
  const entry = DataStore.logTimesheet({
    id: tsId,
    operator_id,
    job_id: job_id === 'direct' ? null : job_id,
    date,
    end_date: isPeriod ? end_date : null,
    hours,
    notes,
  });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('timesheets').insert({
      id: tsId,
      operator_id,
      job_id: job_id === 'direct' ? null : job_id,
      date,
      hours,
      notes,
      rate_applied: entry.rate_applied,
    });
    if (dbErr) console.error('Supabase timesheet insert error:', dbErr);
  }

  revalidatePath('/timesheets');
  revalidatePath(`/operators/${operator_id}`);
  if (job_id && job_id !== 'direct') {
    revalidatePath(`/jobs/${job_id}`);
  }
  revalidatePath('/payroll');
  return { success: true, timesheet: entry };
}

export async function deleteTimesheetAction(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('timesheets').delete().eq('id', id);
  }

  const success = DataStore.deleteTimesheet(id);
  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/timesheets');
  revalidatePath('/payroll');
  return { success };
}

export async function updateTimesheetAction(id: string, formData: FormData) {
  const operator_id = formData.get('operator_id')?.toString();
  const job_id = formData.get('job_id')?.toString() || null;
  const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
  const hours = parseFloat(formData.get('hours')?.toString() || '0');
  const notes = formData.get('notes')?.toString().trim() || null;

  if (hours <= 0 || hours > 24) {
    throw new Error('Hours must be between 0.25 and 24.');
  }

  const updated = DataStore.updateTimesheet(id, {
    operator_id,
    job_id: job_id === 'direct' ? null : job_id,
    date,
    hours,
    notes,
  });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase
      .from('timesheets')
      .update({
        operator_id: updated.operator_id,
        job_id: updated.job_id,
        date: updated.date,
        hours: updated.hours,
        notes: updated.notes,
        rate_applied: updated.rate_applied,
      })
      .eq('id', id);
  }

  revalidatePath('/timesheets');
  revalidatePath('/payroll');
  if (updated.operator_id) revalidatePath(`/operators/${updated.operator_id}`);
  if (updated.job_id) revalidatePath(`/jobs/${updated.job_id}`);
  return { success: true, timesheet: updated };
}

// USER MANAGEMENT ACTIONS (ADMIN ONLY)
export async function inviteUserAction(formData: FormData) {
  await checkAdminPermission();

  const rawUsername = formData.get('username')?.toString().trim();
  const username = rawUsername?.toLowerCase();
  const password = formData.get('password')?.toString();
  const role = (formData.get('role')?.toString() || 'staff') as UserRole;
  const full_name = formData.get('full_name')?.toString().trim() || null;

  if (!username) {
    throw new Error('Username is required.');
  }

  if (!password || password.length < 6) {
    throw new Error('Temporary password must be at least 6 characters.');
  }

  const userId = crypto.randomUUID();
  const password_hash = hashPassword(password);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('profiles').insert({
      id: userId,
      username,
      role,
      full_name,
      password_hash,
    });
    if (dbErr) console.error('Supabase profile insert error:', dbErr);
  }

  const profile = DataStore.createProfile({
    id: userId,
    username,
    role,
    full_name,
    password_hash,
  });

  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/users');
  return { success: true, profile };
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  await checkAdminPermission();

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const newHash = hashPassword(newPassword);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('profiles').update({ password_hash: newHash }).eq('id', userId);
  }

  const ok = DataStore.resetUserPassword(userId, newPassword);
  if (!ok) throw new Error('User account not found.');

  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/users');
  return { success: true };
}

export async function updateUserAction(id: string, formData: FormData) {
  await checkAdminPermission();

  const rawUsername = formData.get('username')?.toString().trim();
  const username = rawUsername?.toLowerCase();
  const full_name = formData.get('full_name')?.toString().trim() || null;
  const role = formData.get('role')?.toString() as UserRole | undefined;
  const newPassword = formData.get('new_password')?.toString();

  if (!username) {
    throw new Error('Username cannot be empty.');
  }

  if (newPassword && newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const updates: Partial<Profile> & { newPassword?: string } = {
    username,
    full_name,
  };
  if (role) updates.role = role;
  if (newPassword) updates.newPassword = newPassword;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const dbUpdates: Record<string, unknown> = {
      username,
      full_name,
    };
    if (role) dbUpdates.role = role;
    if (newPassword) dbUpdates.password_hash = hashPassword(newPassword);

    const { error: dbErr } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
    if (dbErr) console.error('Supabase profile update error:', dbErr);
  }

  const updated = DataStore.updateProfile(id, updates);

  // If the user updated is the currently logged-in session user, update their cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const currentSession = verifyJwt(token);
      if (
        currentSession &&
        (currentSession.userId === id ||
          currentSession.username.toLowerCase() === updated.username.toLowerCase())
      ) {
        const newToken = signJwt({
          userId: updated.id,
          username: updated.username,
          role: updated.role,
          fullName: updated.full_name,
        });
        cookieStore.set(COOKIE_NAME, newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 86400,
        });
      }
    }
  } catch (cookieErr) {
    console.warn('Could not refresh session cookie in updateUserAction:', cookieErr);
  }

  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/users');
  revalidatePath('/', 'layout');
  return { success: true, profile: updated };
}

export async function deleteUserAction(id: string) {
  await checkAdminPermission();

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('profiles').delete().eq('id', id);
  }

  const ok = DataStore.deleteProfile(id);
  if (!ok) throw new Error('User account not found.');

  await DataStore.syncFromSupabase(true).catch(() => {});
  revalidatePath('/users');
  return { success: true };
}

// FORGOT PASSWORD / PASSWORD RESET REQUESTS
export async function requestPasswordResetAction(formData: FormData) {
  const username = formData.get('username')?.toString().trim();
  const notes = formData.get('notes')?.toString().trim() || null;

  if (!username) {
    throw new Error('Please enter your username.');
  }

  // Create request in DataStore
  const resetReq = DataStore.createPasswordResetRequest(username, notes || undefined);

  // If Supabase is available, we can also record it if table exists
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('password_reset_requests').insert({
        id: resetReq.id,
        username: resetReq.username,
        status: resetReq.status,
        requested_at: resetReq.requested_at,
        notes: resetReq.notes,
      });
    } catch {
      // ignore if table does not exist in Supabase schema
    }
  }

  revalidatePath('/users');
  return { success: true, request: resetReq };
}

export async function resolvePasswordResetRequestAction(requestId: string, newPassword: string) {
  await checkAdminPermission();

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const requests = DataStore.getPasswordResetRequests();
  const targetReq = requests.find((r) => r.id === requestId);
  if (!targetReq) {
    throw new Error('Reset request not found.');
  }

  const user = DataStore.getProfileByUsername(targetReq.username);
  if (!user) {
    throw new Error(`No user profile found matching username "${targetReq.username}".`);
  }

  // Reset user password
  await resetUserPasswordAction(user.id, newPassword);

  // Mark request resolved
  DataStore.resolvePasswordResetRequest(requestId, newPassword);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from('password_reset_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', requestId);
    } catch {
      // ignore table absence
    }
  }

  revalidatePath('/users');
  return { success: true, username: targetReq.username };
}

export async function dismissPasswordResetRequestAction(requestId: string) {
  await checkAdminPermission();

  DataStore.dismissPasswordResetRequest(requestId);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from('password_reset_requests')
        .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
        .eq('id', requestId);
    } catch {
      // ignore table absence
    }
  }

  revalidatePath('/users');
  return { success: true };
}
