-- LB Staff Manager - Supabase SQL Schema
-- Run in Supabase SQL Editor or via Supabase CLI migrations

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE operator_role AS ENUM (
        'Excavator Operator',
        'ADT Operator',
        'Dozer Operator',
        'Dumper Operator',
        'Roller Operator',
        'Telehandler Operator',
        'Groundworker',
        'Pipe Layer',
        'General Labourer',
        'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM (
        'Working',
        'Available',
        'Starting Soon',
        'On Leave',
        'Do Not Use'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_type AS ENUM (
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
        'Slinger/Signaller'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'Draft',
        'Filled',
        'In Progress',
        'Completed',
        'Cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operators
CREATE TABLE IF NOT EXISTS public.operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    primary_role operator_role NOT NULL,
    location TEXT,
    experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    current_company TEXT,
    availability_status availability_status NOT NULL DEFAULT 'Available',
    hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
    daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (daily_rate >= 0),
    tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_sort_code TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operator Tickets (Many-to-Many / Multi-Select)
CREATE TABLE IF NOT EXISTS public.operator_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    ticket_type ticket_type NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client TEXT NOT NULL,
    site_name TEXT NOT NULL,
    postcode TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    required_operator_count INTEGER NOT NULL DEFAULT 1 CHECK (required_operator_count > 0),
    required_role operator_role NOT NULL,
    pay_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (pay_rate >= 0),
    charge_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (charge_rate >= 0),
    site_contact_name TEXT,
    site_contact_phone TEXT,
    notes TEXT,
    status job_status NOT NULL DEFAULT 'Draft',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Assignments
CREATE TABLE IF NOT EXISTS public.job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Timesheets
CREATE TABLE IF NOT EXISTS public.timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    notes TEXT,
    rate_applied NUMERIC(10,2) NOT NULL CHECK (rate_applied >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_operators_availability ON public.operators(availability_status);
CREATE INDEX IF NOT EXISTS idx_operators_primary_role ON public.operators(primary_role);
CREATE INDEX IF NOT EXISTS idx_operators_archived ON public.operators(is_archived);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_archived ON public.jobs(is_archived);
CREATE INDEX IF NOT EXISTS idx_job_assignments_active ON public.job_assignments(job_id, operator_id) WHERE unassigned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_operator ON public.timesheets(operator_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_job ON public.timesheets(job_id);

-- 5. TRIGGER FUNCTIONS

-- Function: update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_operators_updated_at
BEFORE UPDATE ON public.operators
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_timesheets_updated_at
BEFORE UPDATE ON public.timesheets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function: Auto status lifecycle for jobs on assignment change
CREATE OR REPLACE FUNCTION public.handle_job_assignment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    target_job_id UUID;
    active_count INT;
    req_count INT;
    current_status job_status;
BEGIN
    target_job_id := COALESCE(NEW.job_id, OLD.job_id);

    SELECT required_operator_count, status
    INTO req_count, current_status
    FROM public.jobs
    WHERE id = target_job_id;

    SELECT COUNT(*)
    INTO active_count
    FROM public.job_assignments
    WHERE job_id = target_job_id AND unassigned_at IS NULL;

    -- Lifecycle rules:
    -- If status is Draft and active_count >= required_count -> Filled
    -- If status is Filled and active_count < required_count -> Draft
    -- In Progress, Completed, Cancelled remain untouched unless manually modified
    IF current_status = 'Draft' AND active_count >= req_count THEN
        UPDATE public.jobs
        SET status = 'Filled', updated_at = now()
        WHERE id = target_job_id;
    ELSIF current_status = 'Filled' AND active_count < req_count THEN
        UPDATE public.jobs
        SET status = 'Draft', updated_at = now()
        WHERE id = target_job_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_job_assignment_status
AFTER INSERT OR UPDATE ON public.job_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_job_assignment_status_change();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Helper to check user role from profiles
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text AS $$
DECLARE
    user_role_val text;
BEGIN
    SELECT role::text INTO user_role_val
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN user_role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert or update any profile"
ON public.profiles FOR ALL
TO authenticated
USING (public.get_auth_user_role() = 'admin' OR auth.uid() = id);

-- Operators Policies
CREATE POLICY "Authenticated users can view active operators"
ON public.operators FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create operators"
ON public.operators FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update operators"
ON public.operators FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Operator Tickets Policies
CREATE POLICY "Authenticated users can manage operator tickets"
ON public.operator_tickets FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Jobs Policies
CREATE POLICY "Authenticated users can view jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage jobs"
ON public.jobs FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Job Assignments Policies
CREATE POLICY "Authenticated users can manage assignments"
ON public.job_assignments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Timesheets Policies
CREATE POLICY "Authenticated users can read timesheets"
ON public.timesheets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert timesheets"
ON public.timesheets FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update own timesheets or admins can update any"
ON public.timesheets FOR UPDATE
TO authenticated
USING (
    public.get_auth_user_role() = 'admin' OR created_by = auth.uid()
)
WITH CHECK (
    public.get_auth_user_role() = 'admin' OR created_by = auth.uid()
);

CREATE POLICY "Staff can delete own timesheets or admins can delete any"
ON public.timesheets FOR DELETE
TO authenticated
USING (
    public.get_auth_user_role() = 'admin' OR created_by = auth.uid()
);
