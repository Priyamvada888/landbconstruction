import {
  Operator,
  Job,
  JobAssignment,
  Timesheet,
  Profile,
  UserRole,
  OperatorRole,
  CompanyPayrollReport,
  OperatorPayrollSummary,
  PayrollEntry,
  OperatorTicket,
  PasswordResetRequest,
  OperatorDocument,
} from '@/types/database';
import { hashPassword, verifyPassword } from './jwt';
import { getSupabaseAdmin } from './supabase/admin';

// Server-side in-memory cache — always populated from Supabase on first request
let operatorsStore: Operator[] = [];
let jobsStore: Job[] = [];
let timesheetsStore: Timesheet[] = [];
let profilesStore: Profile[] = [];
let passwordResetRequestsStore: PasswordResetRequest[] = [];
let currentSessionRole: UserRole = 'admin'; // default session role
let isSyncedWithSupabase = false;
let lastSyncTimestamp = 0;
const SYNC_CACHE_TTL_MS = 2500; // 2.5s TTL so multiple components on the same page don't spam Supabase

export async function syncFromSupabase(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && isSyncedWithSupabase && now - lastSyncTimestamp < SYNC_CACHE_TTL_MS) {
    return true;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const [opsRes, ticksRes, docsRes, jobsRes, asgsRes, tssRes, profsRes] = await Promise.all([
      supabase.from('operators').select('*'),
      supabase.from('operator_tickets').select('*'),
      Promise.resolve(supabase.from('operator_documents').select('*')).catch(() => ({ data: [] })),
      supabase.from('jobs').select('*'),
      supabase.from('job_assignments').select('*'),
      supabase.from('timesheets').select('*'),
      supabase.from('profiles').select('*'),
    ]);

    if (opsRes.error || jobsRes.error) {
      console.warn('Supabase sync warning:', opsRes.error || jobsRes.error);
      return false;
    }

    const ticketsByOp: Record<string, OperatorTicket[]> = {};
    (ticksRes.data || []).forEach((t: any) => {
      if (!ticketsByOp[t.operator_id]) ticketsByOp[t.operator_id] = [];
      ticketsByOp[t.operator_id].push({
        id: t.id,
        operator_id: t.operator_id,
        ticket_type: t.ticket_type,
        expiry_date: t.expiry_date,
        created_at: t.created_at,
      });
    });

    const docsByOp: Record<string, OperatorDocument[]> = {};
    ((docsRes && 'data' in docsRes ? docsRes.data : []) || []).forEach((d: any) => {
      if (!docsByOp[d.operator_id]) docsByOp[d.operator_id] = [];
      docsByOp[d.operator_id].push({
        id: d.id,
        operator_id: d.operator_id,
        name: d.name,
        document_type: d.document_type || 'other',
        file_url: d.file_url,
        file_type: d.file_type || 'application/pdf',
        file_size: d.file_size,
        created_at: d.created_at,
      });
    });

    if (Array.isArray(opsRes.data)) {
      operatorsStore = opsRes.data.map((op: any) => ({
        id: op.id,
        name: op.name,
        phone: op.phone,
        email: op.email,
        primary_role: op.primary_role,
        location: op.location,
        address: op.address || op.location,
        ni_number: op.ni_number || null,
        utr_number: op.utr_number || null,
        experience_years: Number(op.experience_years || 0),
        current_company: op.current_company,
        availability_status: op.availability_status,
        hourly_rate: Number(op.hourly_rate || 0),
        daily_rate: Number(op.daily_rate || 0),
        tax_rate_percent: Number(op.tax_rate_percent || 20),
        bank_name: op.bank_name,
        bank_account_name: op.bank_account_name,
        bank_account_number: op.bank_account_number,
        bank_sort_code: op.bank_sort_code,
        is_archived: Boolean(op.is_archived),
        created_at: op.created_at,
        updated_at: op.updated_at,
        tickets: ticketsByOp[op.id] || [],
        documents: docsByOp[op.id] || [],
      }));
    }

    const asgsByJob: Record<string, JobAssignment[]> = {};
    (asgsRes.data || []).forEach((asg: any) => {
      if (!asgsByJob[asg.job_id]) asgsByJob[asg.job_id] = [];
      asgsByJob[asg.job_id].push({
        id: asg.id,
        job_id: asg.job_id,
        operator_id: asg.operator_id,
        assigned_at: asg.assigned_at,
        unassigned_at: asg.unassigned_at,
      });
    });

    if (Array.isArray(jobsRes.data)) {
      jobsStore = jobsRes.data.map((j: any) => ({
        id: j.id,
        client: j.client,
        site_name: j.site_name,
        postcode: j.postcode,
        start_date: j.start_date,
        end_date: j.end_date,
        required_operator_count: Number(j.required_operator_count || 1),
        required_role: j.required_role,
        pay_rate: Number(j.pay_rate || 0),
        charge_rate: Number(j.charge_rate || 0),
        site_contact_name: j.site_contact_name,
        site_contact_phone: j.site_contact_phone,
        notes: j.notes,
        status: j.status,
        is_archived: Boolean(j.is_archived),
        created_at: j.created_at,
        updated_at: j.updated_at,
        assignments: asgsByJob[j.id] || [],
      }));
    }

    if (Array.isArray(tssRes.data)) {
      timesheetsStore = tssRes.data.map((ts: any) => {
        const op = operatorsStore.find((o) => o.id === ts.operator_id);
        const j = jobsStore.find((jb) => jb.id === ts.job_id);
        return {
          id: ts.id,
          operator_id: ts.operator_id,
          date: ts.date,
          hours: Number(ts.hours || 0),
          job_id: ts.job_id,
          notes: ts.notes,
          rate_applied: Number(ts.rate_applied || 0),
          created_at: ts.created_at,
          updated_at: ts.updated_at,
          operator: op,
          job: j,
        };
      });
    }

    if (Array.isArray(profsRes.data)) {
      profilesStore = profsRes.data.map((p: any) => ({
        id: p.id,
        username: p.username,
        role: p.role,
        full_name: p.full_name,
        password_hash: p.password_hash,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
    }

    isSyncedWithSupabase = true;
    lastSyncTimestamp = now;
    return true;
  } catch (err) {
    console.error('Error syncing with Supabase:', err);
    return false;
  }
}

// Initial eager sync on server runtime
if (typeof window === 'undefined') {
  syncFromSupabase().catch(() => {});
}

export const DataStore = {
  syncFromSupabase,

  // Current session role simulation / check
  getSessionRole(): UserRole {
    return currentSessionRole;
  },

  setSessionRole(role: UserRole) {
    currentSessionRole = role;
  },

  // PROFILES & AUTH
  getProfiles(): Profile[] {
    return profilesStore;
  },

  getProfileByUsername(username: string): Profile | undefined {
    return profilesStore.find(
      (p) => p.username.toLowerCase() === username.trim().toLowerCase()
    );
  },

  verifyUserCredentials(username: string, password: string): Profile | null {
    const profile = this.getProfileByUsername(username);
    if (!profile || !profile.password_hash) return null;

    const isValid = verifyPassword(password, profile.password_hash);
    return isValid ? profile : null;
  },

  createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'> & { id?: string }): Profile {
    const existing = this.getProfileByUsername(profile.username);
    if (existing) {
      throw new Error(`Username "${profile.username}" is already registered.`);
    }

    const newProfile: Profile = {
      ...profile,
      id: profile.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    profilesStore.push(newProfile);
    return newProfile;
  },

  upsertProfile(profile: Profile): void {
    const idx = profilesStore.findIndex(
      (p) => p.id === profile.id || p.username.toLowerCase() === profile.username.toLowerCase()
    );
    if (idx >= 0) {
      profilesStore[idx] = { ...profilesStore[idx], ...profile };
    } else {
      profilesStore.push(profile);
    }
  },

  resetUserPassword(userId: string, newPassword: string): boolean {
    const user = profilesStore.find((p) => p.id === userId);
    if (!user) return false;
    user.password_hash = hashPassword(newPassword);
    user.updated_at = new Date().toISOString();
    return true;
  },

  updateProfile(id: string, updates: Partial<Profile> & { newPassword?: string }): Profile {
    const idx = profilesStore.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('User profile not found');

    if (updates.username && updates.username.toLowerCase() !== profilesStore[idx].username.toLowerCase()) {
      const existing = this.getProfileByUsername(updates.username);
      if (existing && existing.id !== id) {
        throw new Error(`Username "${updates.username}" is already in use.`);
      }
    }

    const newHash = updates.newPassword ? hashPassword(updates.newPassword) : profilesStore[idx].password_hash;

    profilesStore[idx] = {
      ...profilesStore[idx],
      ...updates,
      password_hash: newHash,
      updated_at: new Date().toISOString(),
    };

    return profilesStore[idx];
  },

  deleteProfile(id: string): boolean {
    const idx = profilesStore.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    // Check not deleting last admin
    const admins = profilesStore.filter((p) => p.role === 'admin');
    if (profilesStore[idx].role === 'admin' && admins.length <= 1) {
      throw new Error('Cannot delete the only administrator account.');
    }
    profilesStore.splice(idx, 1);
    return true;
  },

  // OPERATORS
  getOperators(includeArchived = false): Operator[] {
    return operatorsStore.filter((op) => includeArchived || !op.is_archived);
  },

  getOperatorById(id: string): Operator | undefined {
    return operatorsStore.find((op) => op.id === id);
  },

  createOperator(data: Omit<Operator, 'id' | 'is_archived' | 'created_at' | 'updated_at'> & { id?: string }): Operator {
    if (data.hourly_rate < 0 || data.daily_rate < 0 || data.tax_rate_percent < 0) {
      throw new Error('Rates and tax cannot be negative');
    }
    const id = data.id || crypto.randomUUID();
    const newOp: Operator = {
      id,
      ...data,
      address: data.address || data.location,
      location: data.location || data.address || null,
      ni_number: data.ni_number || null,
      utr_number: data.utr_number || null,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tickets: data.tickets || [],
      documents: data.documents || [],
    };
    operatorsStore.unshift(newOp);
    return newOp;
  },

  updateOperator(id: string, updates: Partial<Operator>): Operator {
    const idx = operatorsStore.findIndex((op) => op.id === id);
    if (idx === -1) throw new Error('Operator not found');

    if (
      (updates.hourly_rate !== undefined && updates.hourly_rate < 0) ||
      (updates.daily_rate !== undefined && updates.daily_rate < 0) ||
      (updates.tax_rate_percent !== undefined && updates.tax_rate_percent < 0)
    ) {
      throw new Error('Rates and tax cannot be negative');
    }

    const mergedUpdates = { ...updates };
    if (mergedUpdates.address && !mergedUpdates.location) {
      mergedUpdates.location = mergedUpdates.address;
    }
    if (mergedUpdates.location && !mergedUpdates.address) {
      mergedUpdates.address = mergedUpdates.location;
    }

    operatorsStore[idx] = {
      ...operatorsStore[idx],
      ...mergedUpdates,
      updated_at: new Date().toISOString(),
    };
    return operatorsStore[idx];
  },

  addOperatorDocument(
    operatorId: string,
    doc: Omit<OperatorDocument, 'id' | 'operator_id' | 'created_at'> & { id?: string }
  ): OperatorDocument {
    const op = this.getOperatorById(operatorId);
    if (!op) throw new Error('Operator not found');
    const newDoc: OperatorDocument = {
      id: doc.id || crypto.randomUUID(),
      operator_id: operatorId,
      name: doc.name,
      document_type: doc.document_type || 'other',
      file_url: doc.file_url,
      file_type: doc.file_type || 'application/pdf',
      file_size: doc.file_size,
      created_at: new Date().toISOString(),
    };
    if (!op.documents) op.documents = [];
    op.documents.unshift(newDoc);
    return newDoc;
  },

  deleteOperatorDocument(operatorId: string, docId: string): boolean {
    const op = this.getOperatorById(operatorId);
    if (!op || !op.documents) return false;
    const idx = op.documents.findIndex((d) => d.id === docId);
    if (idx === -1) return false;
    op.documents.splice(idx, 1);
    return true;
  },

  archiveOperator(id: string): Operator {
    return this.updateOperator(id, { is_archived: true });
  },

  restoreOperator(id: string): Operator {
    return this.updateOperator(id, { is_archived: false });
  },

  deleteOperator(id: string): boolean {
    const idx = operatorsStore.findIndex((op) => op.id === id);
    if (idx === -1) return false;
    operatorsStore.splice(idx, 1);
    return true;
  },

  // JOBS
  getJobs(includeArchived = false): Job[] {
    return jobsStore.filter((j) => includeArchived || !j.is_archived);
  },

  getJobById(id: string): (Job & { active_assignments: JobAssignment[] }) | undefined {
    const job = jobsStore.find((j) => j.id === id);
    if (!job) return undefined;

    const active_assignments = (job.assignments || [])
      .filter((asg) => !asg.unassigned_at)
      .map((asg) => ({
        ...asg,
        operator: operatorsStore.find((op) => op.id === asg.operator_id),
      }));

    return {
      ...job,
      active_assignments,
    };
  },

  createJob(data: Omit<Job, 'id' | 'is_archived' | 'created_at' | 'updated_at' | 'assignments'> & { id?: string }): Job {
    if (data.pay_rate < 0 || data.charge_rate < 0 || data.required_operator_count <= 0) {
      throw new Error('Rates must be positive and required count must be greater than 0');
    }
    const id = data.id || crypto.randomUUID();
    const newJob: Job = {
      id,
      ...data,
      status: 'Draft',
      is_archived: false,
      assignments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    jobsStore.unshift(newJob);
    return newJob;
  },

  updateJob(id: string, updates: Partial<Job>): Job {
    const idx = jobsStore.findIndex((j) => j.id === id);
    if (idx === -1) throw new Error('Job not found');

    jobsStore[idx] = {
      ...jobsStore[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return jobsStore[idx];
  },

  archiveJob(id: string): Job {
    return this.updateJob(id, { is_archived: true });
  },

  deleteJob(id: string): boolean {
    const idx = jobsStore.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    jobsStore.splice(idx, 1);
    return true;
  },

  // JOB ASSIGNMENTS & STATUS LIFECYCLE
  assignOperatorToJob(jobId: string, operatorId: string): Job {
    const job = jobsStore.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found');

    const op = operatorsStore.find((o) => o.id === operatorId);
    if (!op) throw new Error('Operator not found');

    // Check if already actively assigned
    const active = (job.assignments || []).find(
      (a) => a.operator_id === operatorId && !a.unassigned_at
    );
    if (active) throw new Error('Operator is already assigned to this job');

    const newAssignment: JobAssignment = {
      id: `asg-${Date.now()}`,
      job_id: jobId,
      operator_id: operatorId,
      assigned_at: new Date().toISOString(),
      unassigned_at: null,
    };

    job.assignments = [...(job.assignments || []), newAssignment];

    // Status lifecycle trigger:
    // If status = Draft and active count >= required_operator_count -> auto-set Filled
    const activeCount = job.assignments.filter((a) => !a.unassigned_at).length;
    if (job.status === 'Draft' && activeCount >= job.required_operator_count) {
      job.status = 'Filled';
    }

    job.updated_at = new Date().toISOString();
    return job;
  },

  unassignOperatorFromJob(jobId: string, operatorId: string): Job {
    const job = jobsStore.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found');

    const assignment = (job.assignments || []).find(
      (a) => a.operator_id === operatorId && !a.unassigned_at
    );
    if (!assignment) throw new Error('Active assignment not found');

    assignment.unassigned_at = new Date().toISOString();

    // Status lifecycle trigger:
    // If status = Filled and active count < required_operator_count -> auto-revert Draft
    const activeCount = (job.assignments || []).filter((a) => !a.unassigned_at).length;
    if (job.status === 'Filled' && activeCount < job.required_operator_count) {
      job.status = 'Draft';
    }

    job.updated_at = new Date().toISOString();
    return job;
  },

  getSuggestedCandidates(jobId: string): { suggested: Operator[]; override: Operator[] } {
    const job = jobsStore.find((j) => j.id === jobId);
    if (!job) return { suggested: [], override: [] };

    const activeAssignedIds = new Set(
      (job.assignments || [])
        .filter((a) => !a.unassigned_at)
        .map((a) => a.operator_id)
    );

    const nonArchived = operatorsStore.filter((op) => !op.is_archived && !activeAssignedIds.has(op.id));

    // Suggested: matching role AND availability IN (Available, Starting Soon, Working)
    const suggested = nonArchived.filter(
      (op) =>
        op.primary_role === job.required_role &&
        ['Available', 'Starting Soon', 'Working'].includes(op.availability_status)
    );

    const suggestedIds = new Set(suggested.map((s) => s.id));
    const override = nonArchived.filter((op) => !suggestedIds.has(op.id));

    return { suggested, override };
  },

  // TIMESHEETS & RATE LOGIC
  getTimesheets(filters?: { operatorId?: string; jobId?: string; startDate?: string; endDate?: string }): Timesheet[] {
    let list = [...timesheetsStore];

    if (filters?.operatorId) {
      list = list.filter((t) => t.operator_id === filters.operatorId);
    }
    if (filters?.jobId) {
      list = list.filter((t) => t.job_id === filters.jobId);
    }
    if (filters?.startDate) {
      list = list.filter((t) => t.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((t) => t.date <= filters.endDate!);
    }

    // Hydrate relations
    return list.map((t) => ({
      ...t,
      operator: operatorsStore.find((op) => op.id === t.operator_id),
      job: jobsStore.find((j) => j.id === t.job_id),
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  logTimesheet(data: {
    id?: string;
    operator_id: string;
    job_id?: string | null;
    date: string;
    hours: number;
    notes?: string | null;
  }): Timesheet {
    if (data.hours <= 0 || data.hours > 24) {
      throw new Error('Hours must be between 0.25 and 24');
    }

    const op = operatorsStore.find((o) => o.id === data.operator_id);
    if (!op) throw new Error('Operator not found');

    let rate_applied: number;

    if (data.job_id) {
      const job = jobsStore.find((j) => j.id === data.job_id);
      if (!job) throw new Error('Job not found');

      // Verify operator is actively assigned to this job
      const isAssigned = (job.assignments || []).some(
        (a) => a.operator_id === data.operator_id && !a.unassigned_at
      );
      if (!isAssigned) {
        throw new Error('Operator is not actively assigned to this job');
      }

      rate_applied = Number(job.pay_rate);
    } else {
      rate_applied = Number(op.hourly_rate);
    }

    const entry: Timesheet = {
      id: data.id || crypto.randomUUID(),
      operator_id: data.operator_id,
      date: data.date,
      hours: Number(data.hours),
      job_id: data.job_id || null,
      notes: data.notes || null,
      rate_applied,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    timesheetsStore.unshift(entry);
    return entry;
  },

  updateTimesheet(id: string, data: {
    operator_id?: string;
    job_id?: string | null;
    date?: string;
    hours?: number;
    notes?: string | null;
  }): Timesheet {
    const idx = timesheetsStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Timesheet entry not found');

    const existing = timesheetsStore[idx];
    const opId = data.operator_id || existing.operator_id;
    const jId = data.job_id !== undefined ? data.job_id : existing.job_id;
    const hours = data.hours !== undefined ? Number(data.hours) : existing.hours;
    const date = data.date || existing.date;
    const notes = data.notes !== undefined ? data.notes : existing.notes;

    if (hours <= 0 || hours > 24) {
      throw new Error('Hours must be between 0.25 and 24');
    }

    const op = operatorsStore.find((o) => o.id === opId);
    if (!op) throw new Error('Operator not found');

    let rate_applied = existing.rate_applied;
    if (jId) {
      const job = jobsStore.find((j) => j.id === jId);
      if (job) rate_applied = Number(job.pay_rate);
    } else {
      rate_applied = Number(op.hourly_rate);
    }

    timesheetsStore[idx] = {
      ...existing,
      operator_id: opId,
      job_id: jId || null,
      date,
      hours,
      notes: notes || null,
      rate_applied,
      updated_at: new Date().toISOString(),
    };

    return timesheetsStore[idx];
  },

  deleteTimesheet(id: string): boolean {
    const idx = timesheetsStore.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    timesheetsStore.splice(idx, 1);
    return true;
  },

  // PASSWORD RESET REQUESTS
  getPasswordResetRequests(): PasswordResetRequest[] {
    return [...passwordResetRequestsStore].sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );
  },

  createPasswordResetRequest(username: string, notes?: string): PasswordResetRequest {
    const req: PasswordResetRequest = {
      id: crypto.randomUUID(),
      username: username.trim(),
      status: 'pending',
      requested_at: new Date().toISOString(),
      notes: notes || null,
    };
    passwordResetRequestsStore.unshift(req);
    return req;
  },

  resolvePasswordResetRequest(requestId: string, newPassword?: string): boolean {
    const req = passwordResetRequestsStore.find((r) => r.id === requestId);
    if (!req) return false;

    if (newPassword) {
      const user = this.getProfileByUsername(req.username);
      if (user) {
        this.resetUserPassword(user.id, newPassword);
      }
    }

    req.status = 'resolved';
    req.resolved_at = new Date().toISOString();
    return true;
  },

  dismissPasswordResetRequest(requestId: string): boolean {
    const req = passwordResetRequestsStore.find((r) => r.id === requestId);
    if (!req) return false;
    req.status = 'dismissed';
    req.resolved_at = new Date().toISOString();
    return true;
  },

  // FINANCIALS FOR A JOB
  getJobFinancials(jobId: string) {
    const job = jobsStore.find((j) => j.id === jobId);
    if (!job) return null;

    const jobTimesheets = timesheetsStore.filter((t) => t.job_id === jobId);
    const totalHours = jobTimesheets.reduce((acc, t) => acc + Number(t.hours), 0);
    const revenue = totalHours * Number(job.charge_rate);
    const cost = jobTimesheets.reduce((acc, t) => acc + Number(t.hours) * Number(t.rate_applied), 0);
    const margin = revenue - cost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    return {
      totalHours,
      revenue,
      cost,
      margin,
      marginPercent,
      entryCount: jobTimesheets.length,
    };
  },

  // OPERATOR HOURS BREAKDOWN (This Week, This Month, This Year)
  getOperatorHoursSummary(operatorId: string) {
    const now = new Date();

    // Start of this week (Monday)
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const weekStartStr = monday.toISOString().split('T')[0];

    // Start of this month
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Start of this year
    const yearStartStr = `${now.getFullYear()}-01-01`;

    const opTimesheets = timesheetsStore.filter((t) => t.operator_id === operatorId);

    const weekHours = opTimesheets
      .filter((t) => t.date >= weekStartStr)
      .reduce((acc, t) => acc + Number(t.hours), 0);

    const monthHours = opTimesheets
      .filter((t) => t.date >= monthStartStr)
      .reduce((acc, t) => acc + Number(t.hours), 0);

    const yearHours = opTimesheets
      .filter((t) => t.date >= yearStartStr)
      .reduce((acc, t) => acc + Number(t.hours), 0);

    return { weekHours, monthHours, yearHours };
  },

  // PAYROLL REPORT GENERATION (Admin Only)
  getPayrollReport(periodType: 'weekly' | 'monthly', offset = 0): CompanyPayrollReport {
    const now = new Date();
    let startDate: string;
    let endDate: string;
    let label: string;

    if (periodType === 'weekly') {
      // Offset by weeks
      const base = new Date();
      base.setDate(base.getDate() + offset * 7);

      const day = base.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(base);
      monday.setDate(base.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      startDate = monday.toISOString().split('T')[0];
      endDate = sunday.toISOString().split('T')[0];
      label = `Week of ${startDate} to ${endDate}`;
    } else {
      // Offset by months
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year = targetMonthDate.getFullYear();
      const month = targetMonthDate.getMonth();

      const lastDay = new Date(year, month + 1, 0).getDate();
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      label = targetMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    // Filter timesheets in range
    const periodTimesheets = timesheetsStore.filter(
      (t) => t.date >= startDate && t.date <= endDate
    );

    // Group by operator
    const grouped = new Map<string, Timesheet[]>();
    for (const ts of periodTimesheets) {
      if (!grouped.has(ts.operator_id)) {
        grouped.set(ts.operator_id, []);
      }
      grouped.get(ts.operator_id)!.push(ts);
    }

    const summaries: OperatorPayrollSummary[] = [];
    let total_hours = 0;
    let total_gross = 0;
    let total_tax = 0;
    let total_net = 0;

    for (const [opId, entries] of grouped.entries()) {
      const op = operatorsStore.find((o) => o.id === opId);
      if (!op) continue;

      let opHours = 0;
      let opGross = 0;
      let opTax = 0;
      const distinctRates = new Set<number>();
      const entryRows: PayrollEntry[] = [];

      for (const e of entries) {
        const h = Number(e.hours);
        const rate = Number(e.rate_applied);
        distinctRates.add(rate);

        const gross = h * rate;
        const taxRate = Number(op.tax_rate_percent || 20) / 100;
        const tax = gross * taxRate;
        const net = gross - tax;

        opHours += h;
        opGross += gross;
        opTax += tax;

        const job = jobsStore.find((j) => j.id === e.job_id);
        entryRows.push({
          date: e.date,
          hours: h,
          rate_applied: rate,
          job_title: job ? `${job.client} - ${job.site_name}` : 'Unassigned / Direct',
          gross,
          tax,
          net,
        });
      }

      const opNet = opGross - opTax;
      const rate_display = distinctRates.size === 1 ? `£${[...distinctRates][0].toFixed(2)}/hr` : 'Mixed rates';

      total_hours += opHours;
      total_gross += opGross;
      total_tax += opTax;
      total_net += opNet;

      summaries.push({
        operator: op,
        total_hours: opHours,
        rate_display,
        gross_pay: opGross,
        tax_amount: opTax,
        net_pay: opNet,
        entries: entryRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      });
    }

    return {
      period_type: periodType,
      period_label: label,
      start_date: startDate,
      end_date: endDate,
      operator_summaries: summaries.sort((a, b) => a.operator.name.localeCompare(b.operator.name)),
      total_hours,
      total_gross,
      total_tax,
      total_net,
    };
  },
};
