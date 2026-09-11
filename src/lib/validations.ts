import { z } from 'zod';

// ── Shared enums ──────────────────────────────────────────────────────────────

const operatorRoles = [
  'Excavator Operator', 'ADT Operator', 'Dozer Operator', 'Dumper Operator',
  'Roller Operator', 'Telehandler Operator', 'Groundworker', 'Pipe Layer',
  'General Labourer', 'Other',
] as const;

const availabilityStatuses = [
  'Available', 'Working', 'Starting Soon', 'On Leave', 'Do Not Use',
] as const;

const jobStatuses = [
  'Draft', 'Filled', 'In Progress', 'Completed', 'Cancelled',
] as const;

const ticketTypes = [
  'Excavator 180', 'Excavator 360', 'ADT', 'Dozer', 'Dumper', 'Roller',
  'Telehandler', 'CPCS', 'NPORS', 'EUSR', 'CSCS', 'First Aid',
  'Confined Space', 'Slinger/Signaller',
] as const;

const documentTypes = ['passport', 'driving_license', 'ticket', 'other'] as const;

// ── UK-specific validators ────────────────────────────────────────────────────

/** UK National Insurance Number: 2 letters, 6 digits, 1 letter (A–D) */
const niNumberRegex = /^[A-Z]{2}\d{6}[A-D]$/i;

/** UK UTR (Unique Taxpayer Reference): 10 digits, optionally with spaces */
const utrRegex = /^\d{5}\s?\d{5}$/;

/** UK sort code: 6 digits with optional dashes/hyphens */
const sortCodeRegex = /^\d{2}[-\s]?\d{2}[-\s]?\d{2}$/;

/** UK bank account number: 8 digits */
const accountNumberRegex = /^\d{8}$/;

// ── Operator schemas ──────────────────────────────────────────────────────────

export const createOperatorSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(120, 'Name too long'),
  phone: z.string().trim().max(30, 'Phone number too long').nullable().optional(),
  email: z.string().trim().email('Invalid email address').nullable().optional()
    .or(z.literal('').transform(() => null)),
  primary_role: z.enum(operatorRoles, { message: 'Select a valid role' }),
  address: z.string().trim().max(300, 'Address too long').nullable().optional(),
  ni_number: z.string().trim()
    .refine((v) => !v || niNumberRegex.test(v), { message: 'Invalid NI number format (e.g. AB123456C)' })
    .nullable().optional()
    .or(z.literal('').transform(() => null)),
  utr_number: z.string().trim()
    .refine((v) => !v || utrRegex.test(v), { message: 'Invalid UTR format (e.g. 12345 67890)' })
    .nullable().optional()
    .or(z.literal('').transform(() => null)),
  experience_years: z.coerce.number().int().min(0, 'Cannot be negative').max(60, 'Seems too high').default(0),
  current_company: z.string().trim().max(120).nullable().optional(),
  availability_status: z.enum(availabilityStatuses).default('Available'),
  hourly_rate: z.coerce.number().min(0, 'Cannot be negative').max(500, 'Rate seems too high').default(0),
  daily_rate: z.coerce.number().min(0, 'Cannot be negative').max(5000, 'Rate seems too high').default(0),
  tax_rate_percent: z.coerce.number().min(0).max(100, 'Must be 0–100%').default(20),

  // Bank details
  bank_name: z.string().trim().max(100).nullable().optional(),
  bank_account_name: z.string().trim().max(120).nullable().optional(),
  bank_account_number: z.string().trim()
    .refine((v) => !v || accountNumberRegex.test(v), { message: 'Must be 8 digits' })
    .nullable().optional()
    .or(z.literal('').transform(() => null)),
  bank_sort_code: z.string().trim()
    .refine((v) => !v || sortCodeRegex.test(v), { message: 'Format: 12-34-56' })
    .nullable().optional()
    .or(z.literal('').transform(() => null)),
});

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;

/** Update uses the same shape but all fields optional (partial) */
export const updateOperatorSchema = createOperatorSchema.partial();
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;

// ── Job schemas ───────────────────────────────────────────────────────────────

export const createJobSchema = z.object({
  client: z.string().trim().min(1, 'Client name is required').max(120),
  site_name: z.string().trim().min(1, 'Site name is required').max(120),
  postcode: z.string().trim().max(10, 'Invalid postcode').nullable().optional(),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().nullable().optional(),
  required_operator_count: z.coerce.number().int().min(1, 'At least 1 operator required').default(1),
  required_role: z.enum(operatorRoles, { message: 'Select a valid role' }),
  pay_rate: z.coerce.number().min(0, 'Cannot be negative').max(500).default(0),
  charge_rate: z.coerce.number().min(0, 'Cannot be negative').max(1000).default(0),
  site_contact_name: z.string().trim().max(120).nullable().optional(),
  site_contact_phone: z.string().trim().max(30).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(jobStatuses).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = createJobSchema.partial().extend({
  client: z.string().trim().min(1, 'Client name is required').max(120),
  site_name: z.string().trim().min(1, 'Site name is required').max(120),
  required_role: z.enum(operatorRoles, { message: 'Select a valid role' }),
});

// ── Timesheet schemas ─────────────────────────────────────────────────────────

export const logTimesheetSchema = z.object({
  operator_id: z.string().uuid('Invalid operator'),
  job_id: z.string().nullable().optional(),
  date: z.string().min(1, 'Date is required'),
  hours: z.coerce.number()
    .min(0.25, 'Minimum 0.25 hours')
    .max(24, 'Maximum 24 hours per day'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type LogTimesheetInput = z.infer<typeof logTimesheetSchema>;

// ── Document upload schema ────────────────────────────────────────────────────

export const uploadDocumentSchema = z.object({
  doc_name: z.string().trim().min(1, 'Document name required').max(200),
  document_type: z.enum(documentTypes).default('other'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse FormData against a Zod schema.
 * Returns { data, error } — error is a flat, user-friendly string.
 */
export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { data: z.infer<T>; error: null } | { data: null; error: string } {
  const raw: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    // Skip file entries and multi-value keys (tickets handled separately)
    if (value instanceof File) return;
    const existing = raw[key];
    if (existing !== undefined) return; // skip dupes (e.g. tickets[])
    // Convert empty strings to null for optional fields
    raw[key] = value === '' ? null : value;
  });

  const result = schema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const fieldName = firstError.path.join('.');
    return {
      data: null,
      error: fieldName ? `${fieldName}: ${firstError.message}` : firstError.message,
    };
  }

  return { data: result.data, error: null };
}
