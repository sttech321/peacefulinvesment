-- Fix infinite recursion in RLS policies
-- The issue: prayer_tasks policy checks prayer_user_tasks, and prayer_user_tasks policy checks prayer_tasks

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view shared or own prayer tasks" ON public.prayer_tasks;
DROP POLICY IF EXISTS "Users can view tasks they have instances of" ON public.prayer_tasks;

-- Create a single, non-recursive policy for prayer_tasks
-- This policy doesn't check prayer_user_tasks to avoid recursion
CREATE POLICY "Users can view shared or own prayer tasks" 
ON public.prayer_tasks 
FOR SELECT 
USING (
  is_shared = true OR 
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Now update prayer_user_tasks policy to not cause recursion
-- The prayer_user_tasks policy can safely check prayer_tasks.is_shared
-- because it's a direct column check, not a policy check
-- But we need to make sure it doesn't create a loop

-- Drop and recreate prayer_user_tasks SELECT policy to ensure it's correct
DROP POLICY IF EXISTS "Users can view their own prayer tasks" ON public.prayer_user_tasks;

CREATE POLICY "Users can view their own prayer tasks" 
ON public.prayer_user_tasks 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email' OR
  -- Check if task is shared by directly querying the column (not through policy)
  EXISTS (
    SELECT 1 FROM public.prayer_tasks pt
    WHERE pt.id = prayer_user_tasks.task_id 
    AND pt.is_shared = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add a separate policy to allow users to see prayer_tasks they have instances of
-- But we need to do this without causing recursion
-- Solution: Use a function that bypasses RLS or check directly
-- Actually, we can add this as a separate policy that uses a direct join
-- The key is to avoid having the policy evaluation trigger another policy evaluation

-- Create a function to check if user has instance (bypasses RLS for the check)
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

-- Now use this function in the policy (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Users can view tasks they have instances of" 
ON public.prayer_tasks 
FOR SELECT 
USING (
  public.user_has_prayer_instance(prayer_tasks.id)
);
