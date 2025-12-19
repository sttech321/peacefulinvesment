-- Add admin SELECT policy for admin_actions table
-- This allows admins to view all admin actions for audit logging

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can view all admin actions" ON public.admin_actions;

-- Create policy that allows admins to view all admin actions
CREATE POLICY "Admins can view all admin actions"
ON public.admin_actions
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

