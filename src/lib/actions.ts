'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { DataStore } from './store';
import { JobStatus, OperatorRole, AvailabilityStatus, TicketType, UserRole, Job, Profile } from '@/types/database';
import { hashPassword, signJwt, verifyJwt, COOKIE_NAME } from './jwt';
import { getSupabaseAdmin } from './supabase/admin';

export async function checkAdminPermission() {
  const role = DataStore.getSessionRole();
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
  const required_operator_count = parseInt(formData.get('required_operator_count')?.toString() || '1', 10);
  const required_role = formData.get('required_role')?.toString() as OperatorRole;
  const pay_rate = parseFloat(formData.get('pay_rate')?.toString() || '0');
  const charge_rate = parseFloat(formData.get('charge_rate')?.toString() || '0');
  const site_contact_name = formData.get('site_contact_name')?.toString().trim() || null;
  const site_contact_phone = formData.get('site_contact_phone')?.toString().trim() || null;
  const notes = formData.get('notes')?.toString().trim() || null;

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
      notes,
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
  const required_operator_count = parseInt(formData.get('required_operator_count')?.toString() || '1', 10);
  const required_role = formData.get('required_role')?.toString() as OperatorRole;
  const pay_rate = parseFloat(formData.get('pay_rate')?.toString() || '0');
  const charge_rate = parseFloat(formData.get('charge_rate')?.toString() || '0');
  const site_contact_name = formData.get('site_contact_name')?.toString().trim() || null;
  const site_contact_phone = formData.get('site_contact_phone')?.toString().trim() || null;
  const notes = formData.get('notes')?.toString().trim() || null;
  const status = formData.get('status')?.toString() as JobStatus | undefined;

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

  if (start_date) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (status) updates.status = status;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('jobs').update(updates).eq('id', id);
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

  revalidatePath('/dashboard');
  revalidatePath('/jobs');
  return { success: true };
}

export async function assignOperatorAction(jobId: string, operatorId: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('job_assignments').insert({
      job_id: jobId,
      operator_id: operatorId,
    });
    if (dbErr) console.error('Supabase assignment error:', dbErr);
  }

  const updatedJob = DataStore.assignOperatorToJob(jobId, operatorId);

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

// OPERATORS ACTIONS
export async function createOperatorAction(formData: FormData) {
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim() || null;
  const email = formData.get('email')?.toString().trim() || null;
  const primary_role = formData.get('primary_role')?.toString() as OperatorRole;
  const location = formData.get('location')?.toString().trim() || null;
  const experience_years = parseInt(formData.get('experience_years')?.toString() || '0', 10);
  const current_company = formData.get('current_company')?.toString().trim() || null;
  const availability_status = (formData.get('availability_status')?.toString() || 'Available') as AvailabilityStatus;
  const hourly_rate = parseFloat(formData.get('hourly_rate')?.toString() || '0');
  const daily_rate = parseFloat(formData.get('daily_rate')?.toString() || '0');
  const tax_rate_percent = parseFloat(formData.get('tax_rate_percent')?.toString() || '20');

  // Bank details (only admin can assign bank details)
  const role = DataStore.getSessionRole();
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

  // Parse tickets
  const ticketEntries = formData.getAll('tickets') as TicketType[];
  const tickets = ticketEntries.map((t, index) => ({
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
      await supabase.from('operator_tickets').insert(
        tickets.map((tk) => ({
          operator_id: opId,
          ticket_type: tk.ticket_type,
          expiry_date: tk.expiry_date || null,
        }))
      );
    }
  }

  const op = DataStore.createOperator({
    id: opId,
    name,
    phone,
    email,
    primary_role,
    location,
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
  const location = formData.get('location')?.toString().trim() || null;
  const experience_years = parseInt(formData.get('experience_years')?.toString() || '0', 10);
  const current_company = formData.get('current_company')?.toString().trim() || null;
  const availability_status = (formData.get('availability_status')?.toString() || 'Available') as AvailabilityStatus;

  const role = DataStore.getSessionRole();
  const updates: Record<string, unknown> = {
    name,
    phone,
    email,
    primary_role,
    location,
    experience_years,
    current_company,
    availability_status,
  };

  // Only admin can update rates and bank details per Section 7
  if (role === 'admin') {
    if (formData.has('hourly_rate')) updates.hourly_rate = parseFloat(formData.get('hourly_rate')!.toString());
    if (formData.has('daily_rate')) updates.daily_rate = parseFloat(formData.get('daily_rate')!.toString());
    if (formData.has('tax_rate_percent')) updates.tax_rate_percent = parseFloat(formData.get('tax_rate_percent')!.toString());
    if (formData.has('bank_name')) updates.bank_name = formData.get('bank_name')?.toString().trim() || null;
    if (formData.has('bank_account_name')) updates.bank_account_name = formData.get('bank_account_name')?.toString().trim() || null;
    if (formData.has('bank_account_number')) updates.bank_account_number = formData.get('bank_account_number')?.toString().trim() || null;
    if (formData.has('bank_sort_code')) updates.bank_sort_code = formData.get('bank_sort_code')?.toString().trim() || null;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: dbErr } = await supabase.from('operators').update(updates).eq('id', id);
    if (dbErr) console.error('Supabase operator update error:', dbErr);
  }

  const updated = DataStore.updateOperator(id, updates);
  revalidatePath('/operators');
  revalidatePath(`/operators/${id}`);
  return { success: true, operator: updated };
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

  revalidatePath('/operators');
  revalidatePath('/dashboard');
  return { success: true };
}

// TIMESHEETS ACTIONS
export async function logTimesheetAction(formData: FormData) {
  const operator_id = formData.get('operator_id')?.toString();
  const job_id = formData.get('job_id')?.toString() || null;
  const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
  const hours = parseFloat(formData.get('hours')?.toString() || '0');
  const notes = formData.get('notes')?.toString().trim() || null;

  if (!operator_id) {
    throw new Error('Operator is required.');
  }

  if (hours <= 0 || hours > 24) {
    throw new Error('Hours must be between 0.25 and 24.');
  }

  const tsId = crypto.randomUUID();
  const entry = DataStore.logTimesheet({
    id: tsId,
    operator_id,
    job_id: job_id === 'direct' ? null : job_id,
    date,
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
