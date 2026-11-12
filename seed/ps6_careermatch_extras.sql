-- =====================================================================
-- PS6 CareerMatch: extra columns for our app
-- Run this AFTER seed/ps6_job_match.sql in Supabase -> SQL Editor.
-- Safe to run again.
-- Adds an application tracker (status) and a saved cover note to shortlists.
-- =====================================================================

alter table shortlists add column if not exists status text not null default 'saved';
alter table shortlists drop constraint if exists shortlists_status_check;
alter table shortlists add constraint shortlists_status_check
  check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected'));

alter table shortlists add column if not exists cover_note text;
alter table shortlists add column if not exists updated_at timestamptz not null default now();

-- Refresh the API schema cache so the new columns are visible at once.
notify pgrst, 'reload schema';
