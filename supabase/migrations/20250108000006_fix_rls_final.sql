-- Final fix for infinite recursion in RLS policies
-- This migration ensures all policies use SECURITY DEFINER functions to break recursion

-- Step 1: Create helper functions (SECURITY DEFINER bypasses RLS)
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

CREATE OR REPLACE FUNCTION public.task_is_shared(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.prayer_tasks 
    WHERE id = p_task_id
    AND is_shared = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 2: Drop all existing policies on prayer_tasks
DROP POLICY IF EXISTS "Users can view all prayer tasks" ON public.prayer_tasks;
DROP POLICY IF EXISTS "Users can view shared or own prayer tasks" ON public.prayer_tasks;
DROP POLICY IF EXISTS "Users can view shared, assigned, or own prayer tasks" ON public.prayer_tasks;
DROP POLICY IF EXISTS "Users can view tasks they have instances of" ON public.prayer_tasks;

-- Step 3: Recreate prayer_tasks policies using SECURITY DEFINER functions (no recursion)
CREATE POLICY "Users can view shared, assigned, or own prayer tasks" 
ON public.prayer_tasks 
FOR SELECT 
USING (
  is_shared = true OR 
  created_by = auth.uid() OR
  public.user_is_assigned_to_task(prayer_tasks.id) OR
  public.user_has_prayer_instance(prayer_tasks.id) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 4: Update prayer_user_tasks policy to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can view their own prayer tasks" ON public.prayer_user_tasks;

CREATE POLICY "Users can view their own prayer tasks" 
ON public.prayer_user_tasks 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email' OR
  -- Use SECURITY DEFINER function to check if task is shared (bypasses RLS, no recursion)
  public.task_is_shared(prayer_user_tasks.task_id) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 5: Update prayer_task_assignments policies to use SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.prayer_task_assignments;
DROP POLICY IF EXISTS "Admins and creators can assign tasks" ON public.prayer_task_assignments;
DROP POLICY IF EXISTS "Admins and creators can remove assignments" ON public.prayer_task_assignments;

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
