export type UserRole = 'admin' | 'staff';

export type OperatorRole =
  | 'Excavator Operator'
  | 'ADT Operator'
  | 'Dozer Operator'
  | 'Dumper Operator'
  | 'Roller Operator'
  | 'Telehandler Operator'
  | 'Groundworker'
  | 'Pipe Layer'
  | 'General Labourer'
  | 'Other';

export type AvailabilityStatus =
  | 'Working'
  | 'Available'
  | 'Starting Soon'
  | 'On Leave'
  | 'Do Not Use';

export type TicketType =
  | 'Excavator 180'
  | 'Excavator 360'
  | 'ADT'
  | 'Dozer'
  | 'Dumper'
  | 'Roller'
  | 'Telehandler'
  | 'CPCS'
  | 'NPORS'
  | 'EUSR'
  | 'CSCS'
  | 'First Aid'
  | 'Confined Space'
  | 'Slinger/Signaller';

export type JobStatus =
  | 'Draft'
  | 'Filled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PasswordResetRequest {
  id: string;
  username: string;
  status: 'pending' | 'resolved' | 'dismissed';
  requested_at: string;
  resolved_at?: string | null;
  notes?: string | null;
}

export interface OperatorTicket {
  id: string;
  operator_id: string;
  ticket_type: TicketType;
  expiry_date: string | null;
  created_at?: string;
}

export interface Operator {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  primary_role: OperatorRole;
  location: string | null;
  experience_years: number;
  current_company: string | null;
  availability_status: AvailabilityStatus;
  hourly_rate: number;
  daily_rate: number;
  tax_rate_percent: number;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  tickets?: OperatorTicket[];
}

export interface Job {
  id: string;
  client: string;
  site_name: string;
  postcode: string | null;
  start_date: string;
  end_date: string | null;
  required_operator_count: number;
  required_role: OperatorRole;
  pay_rate: number;
  charge_rate: number;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  notes: string | null;
  status: JobStatus;
  is_archived: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assignments?: JobAssignment[];
}

export interface JobAssignment {
  id: string;
  job_id: string;
  operator_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  created_at?: string;
  operator?: Operator;
  job?: Job;
}

export interface Timesheet {
  id: string;
  operator_id: string;
  date: string;
  hours: number;
  job_id: string | null;
  notes: string | null;
  rate_applied: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  operator?: Operator;
  job?: Job;
}

export interface PayrollEntry {
  date: string;
  hours: number;
  rate_applied: number;
  job_title: string;
  gross: number;
  tax: number;
  net: number;
}

export interface OperatorPayrollSummary {
  operator: Operator;
  total_hours: number;
  rate_display: string; // single rate or "Mixed rates"
  gross_pay: number;
  tax_amount: number;
  net_pay: number;
  entries: PayrollEntry[];
}

export interface CompanyPayrollReport {
  period_type: 'weekly' | 'monthly';
  period_label: string;
  start_date: string;
  end_date: string;
  operator_summaries: OperatorPayrollSummary[];
  total_hours: number;
  total_gross: number;
  total_tax: number;
  total_net: number;
}
