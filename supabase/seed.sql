-- LB Staff Manager - Seed Data
-- Provides realistic UK construction staffing demo data

-- Sample Operators
INSERT INTO public.operators (id, name, phone, email, primary_role, location, experience_years, current_company, availability_status, hourly_rate, daily_rate, tax_rate_percent, bank_name, bank_account_name, bank_account_number, bank_sort_code)
VALUES
('a1111111-1111-1111-1111-111111111111', 'Dave Miller', '07700 900123', 'dave.miller@example.co.uk', 'Excavator Operator', 'Manchester (M4)', 12, 'Balfour Beatty Civils', 'Working', 24.50, 220.00, 20.00, 'Barclays', 'David Miller', '12345678', '20-04-15'),
('a2222222-2222-2222-2222-222222222222', 'Callum O''Connor', '07700 900456', 'callum.oc@example.co.uk', 'ADT Operator', 'Leeds (LS1)', 8, 'Galliford Try', 'Working', 22.00, 195.00, 20.00, 'NatWest', 'Callum O Connor', '87654321', '60-12-30'),
('a3333333-3333-3333-3333-333333333333', 'Marcus Vance', '07700 900789', 'marcus.v@example.co.uk', 'Dozer Operator', 'Sheffield (S2)', 15, 'Self-Employed', 'Available', 26.00, 235.00, 20.00, 'HSBC UK', 'Marcus Vance', '23456789', '40-11-18'),
('a4444444-4444-4444-4444-444444444444', 'Sean Kelly', '07700 900321', 'sean.k@example.co.uk', 'Telehandler Operator', 'Liverpool (L3)', 6, 'Kier Group', 'Starting Soon', 21.50, 190.00, 20.00, 'Santander', 'Sean Kelly', '34567890', '09-01-28'),
('a5555555-5555-5555-5555-555555555555', 'Liam Fletcher', '07700 900654', 'liam.f@example.co.uk', 'Groundworker', 'Preston (PR1)', 4, 'Morgan Sindall', 'Working', 18.00, 160.00, 20.00, 'Lloyds Bank', 'Liam Fletcher', '45678901', '30-96-26'),
('a6666666-6666-6666-6666-666666666666', 'Terry Jenkins', '07700 900987', 'terry.j@example.co.uk', 'Dumper Operator', 'Bolton (BL1)', 9, 'Sir Robert McAlpine', 'Available', 20.00, 180.00, 20.00, 'Halifax', 'Terry Jenkins', '56789012', '11-03-44'),
('a7777777-7777-7777-7777-777777777777', 'Wayne Clarke', '07700 900112', 'wayne.c@example.co.uk', 'Excavator Operator', 'Stockport (SK1)', 10, 'Costain', 'Available', 25.00, 225.00, 20.00, 'Barclays', 'Wayne Clarke', '67890123', '20-14-33'),
('a8888888-8888-8888-8888-888888888888', 'Patryk Kowalski', '07700 900334', 'patryk.k@example.co.uk', 'Roller Operator', 'Warrington (WA1)', 5, 'Vinci Construction', 'On Leave', 19.50, 175.00, 20.00, 'NatWest', 'Patryk Kowalski', '78901234', '60-83-71')
ON CONFLICT (id) DO NOTHING;

-- Operator Tickets
INSERT INTO public.operator_tickets (operator_id, ticket_type, expiry_date)
VALUES
('a1111111-1111-1111-1111-111111111111', 'Excavator 360', '2027-08-15'),
('a1111111-1111-1111-1111-111111111111', 'CPCS', '2027-08-15'),
('a1111111-1111-1111-1111-111111111111', 'First Aid', '2026-11-30'),
('a2222222-2222-2222-2222-222222222222', 'ADT', '2028-04-10'),
('a2222222-2222-2222-2222-222222222222', 'NPORS', '2028-04-10'),
('a3333333-3333-3333-3333-333333333333', 'Dozer', '2026-10-01'),
('a3333333-3333-3333-3333-333333333333', 'CPCS', '2026-10-01'),
('a4444444-4444-4444-4444-444444444444', 'Telehandler', '2027-03-22'),
('a4444444-4444-4444-4444-444444444444', 'CSCS', '2029-01-15'),
('a5555555-5555-5555-5555-555555555555', 'CSCS', '2028-09-10'),
('a5555555-5555-5555-5555-555555555555', 'Confined Space', '2026-12-18'),
('a6666666-6666-6666-6666-666666666666', 'Dumper', '2027-05-19'),
('a6666666-6666-6666-6666-666666666666', 'Roller', '2027-05-19'),
('a7777777-7777-7777-7777-777777777777', 'Excavator 360', '2027-11-05'),
('a7777777-7777-7777-7777-777777777777', 'Excavator 180', '2027-11-05')
ON CONFLICT DO NOTHING;

-- Sample Jobs
INSERT INTO public.jobs (id, client, site_name, postcode, start_date, end_date, required_operator_count, required_role, pay_rate, charge_rate, site_contact_name, site_contact_phone, notes, status, created_at, updated_at)
VALUES
('b1111111-1111-1111-1111-111111111111', 'Balfour Beatty', 'A580 East Lancs Bypass Widening', 'M28 2LY', '2026-09-01', '2026-11-30', 2, 'Excavator Operator', 25.00, 34.00, 'Trevor Higgins', '07700 900551', 'Full 360 track machine. Heavy trenching and highway utilities.', 'In Progress', now() - interval '4 days', now() - interval '2 days'),
('b2222222-2222-2222-2222-222222222222', 'Willmott Dixon', 'St Peter''s Square Hub Phase 2', 'M2 3AE', '2026-09-05', '2026-12-15', 1, 'ADT Operator', 22.50, 31.00, 'Rachel Scott', '07700 900552', 'Bell 30t articulated dump truck. PPE 5-point required.', 'Filled', now() - interval '5 days', now() - interval '1 day'),
('b3333333-3333-3333-3333-333333333333', 'Morgan Sindall', 'Salford Quays Dockside Redevelopment', 'M50 3SP', '2026-09-12', '2027-02-28', 2, 'Groundworker', 18.50, 26.00, 'Gary O''Shea', '07700 900553', 'Deep drainage and kerbing gang. CSCS gold or blue essential.', 'Draft', now() - interval '1 day', now() - interval '1 day'),
('b4444444-4444-4444-4444-444444444444', 'Kier Construction', 'Victoria Station Retail Overhaul', 'M3 1WY', '2026-08-15', '2026-09-02', 1, 'Telehandler Operator', 21.00, 29.50, 'Colin Baker', '07700 900554', 'Completed works on schedule, sign-off obtained.', 'Completed', now() - interval '20 days', now() - interval '6 days')
ON CONFLICT (id) DO NOTHING;

-- Job Assignments
INSERT INTO public.job_assignments (job_id, operator_id, assigned_at)
VALUES
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', now() - interval '4 days'),
('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', now() - interval '3 days'),
('b3333333-3333-3333-3333-333333333333', 'a5555555-5555-5555-5555-555555555555', now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- Sample Timesheets (current month and previous days)
INSERT INTO public.timesheets (id, operator_id, date, hours, job_id, notes, rate_applied)
VALUES
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '2026-09-02', 9.00, 'b1111111-1111-1111-1111-111111111111', 'Excavation of trench block B', 25.00),
('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', '2026-09-03', 9.50, 'b1111111-1111-1111-1111-111111111111', 'Rock breaking and sub-base grading', 25.00),
('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', '2026-09-04', 8.50, 'b1111111-1111-1111-1111-111111111111', 'Backfilling and compaction assist', 25.00),
('c4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', '2026-09-03', 8.00, 'b2222222-2222-2222-2222-222222222222', 'Hauling muck to spoil tip', 22.50),
('c5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', '2026-09-04', 8.50, 'b2222222-2222-2222-2222-222222222222', 'Stockpile movement', 22.50),
('c6666666-6666-6666-6666-666666666666', 'a5555555-5555-5555-5555-555555555555', '2026-09-04', 8.00, 'b3333333-3333-3333-3333-333333333333', 'Site compound setup and barriers', 18.50)
ON CONFLICT (id) DO NOTHING;
