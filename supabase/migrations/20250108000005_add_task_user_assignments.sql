-- Add user assignment functionality to prayer tasks
-- Create junction table for task-user assignments
CREATE TABLE IF NOT EXISTS public.prayer_task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.prayer_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.prayer_task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prayer_task_assignments
-- Create helper function first (SECURITY DEFINER bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.task_created_by_user(p_task_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.prayer_tasks 
    WHERE id = p_task_id
    AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Users can view assignments for tasks they're assigned to or tasks they created
CREATE POLICY "Users can view their own assignments" 
ON public.prayer_task_assignments 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  public.task_created_by_user(prayer_task_assignments.task_id, auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins and task creators can create assignments
CREATE POLICY "Admins and creators can assign tasks" 
ON public.prayer_task_assignments 
FOR INSERT 
WITH CHECK (
  public.task_created_by_user(prayer_task_assignments.task_id, auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins and task creators can delete assignments
CREATE POLICY "Admins and creators can remove assignments" 
ON public.prayer_task_assignments 
FOR DELETE 
USING (
  public.task_created_by_user(prayer_task_assignments.task_id, auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prayer_task_assignments_task_id ON public.prayer_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_prayer_task_assignments_user_id ON public.prayer_task_assignments(user_id);

-- Update RLS policy for prayer_tasks to include assigned users
-- First, ensure the helper function exists (from migration 20250108000004)
CREATE OR REPLACE FUNCTION public.user_has_prayer_instance(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.prayer_user_tasks 
    WHERE task_id = p_task_id
    AND (
      user_id = auth.uid() OR
      anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create a helper function to check if user is assigned (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_task(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.prayer_task_assignments 
    WHERE task_id = p_task_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view shared or own prayer tasks" ON public.prayer_tasks;
DROP POLICY IF EXISTS "Users can view shared, assigned, or own prayer tasks" ON public.prayer_tasks;
DROP POLICY IF EXISTS "Users can view tasks they have instances of" ON public.prayer_tasks;

-- Create updated policy that includes assigned users (using SECURITY DEFINER function to avoid recursion)
CREATE POLICY "Users can view shared, assigned, or own prayer tasks" 
ON public.prayer_tasks 
FOR SELECT 
USING (
  is_shared = true OR 
  created_by = auth.uid() OR
  public.user_is_assigned_to_task(prayer_tasks.id) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Re-add policy for tasks with instances (using the helper function - SECURITY DEFINER bypasses RLS)
CREATE POLICY "Users can view tasks they have instances of" 
ON public.prayer_tasks 
FOR SELECT 
USING (
  public.user_has_prayer_instance(prayer_tasks.id)
);
