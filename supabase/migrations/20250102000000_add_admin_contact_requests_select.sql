-- Add admin SELECT, UPDATE, and DELETE policies for contact_requests table
-- This allows admins to manage all contact requests

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admins can update all contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admins can delete all contact requests" ON public.contact_requests;

-- Create policy that allows admins to view all contact requests
-- Check user_roles table for admin/moderator role (primary role storage)
-- Also check profiles.role as fallback
CREATE POLICY "Admins can view all contact requests"
ON public.contact_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Also allow admins to update contact requests
CREATE POLICY "Admins can update all contact requests"
ON public.contact_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Allow admins to delete contact requests
CREATE POLICY "Admins can delete all contact requests"
ON public.contact_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'moderator')
  )
);

