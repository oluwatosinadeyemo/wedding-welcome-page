-- Fix 1: Add missing checked_in / checked_in_at columns to guests.
-- These columns are referenced by the dashboard, check-in page, and
-- search_guests_for_checkin RPC but were never created.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- Fix 2: Restore SELECT access on guests for authenticated (admin) users.
-- Migration 20260511124343 dropped "Anyone can look up guests" (which covered
-- both anon and authenticated) without adding a replacement for authenticated.
-- Anon access intentionally remains removed (anon uses SECURITY DEFINER RPCs).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'guests'
      AND policyname = 'Authenticated can view guests'
  ) THEN
    CREATE POLICY "Authenticated can view guests"
    ON public.guests
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
