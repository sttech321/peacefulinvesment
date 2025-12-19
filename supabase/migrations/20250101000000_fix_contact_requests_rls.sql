-- Fix RLS policy for contact_requests table to allow anonymous submissions
-- This allows public contact form submissions without authentication

-- Drop existing policy if it exists (to recreate it correctly)
DROP POLICY IF EXISTS "Allow public contact form submissions" ON public.contact_requests;

-- Create policy that allows anonymous users to insert contact requests
CREATE POLICY "Allow public contact form submissions"
ON public.contact_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also allow anonymous users to view their own submissions (optional, for confirmation)
-- This is commented out as contact forms typically don't need this
-- CREATE POLICY "Allow public to view own submissions"
-- ON public.contact_requests
-- FOR SELECT
-- TO anon, authenticated
-- USING (true);

-- Ensure RLS is enabled on the table
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

