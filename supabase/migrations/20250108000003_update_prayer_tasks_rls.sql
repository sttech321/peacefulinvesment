-- Update RLS policy for prayer_tasks to support private/shared tasks
-- Drop the old "view all" policy
DROP POLICY IF EXISTS "Users can view all prayer tasks" ON public.prayer_tasks;

-- Create new policy: Users can view shared tasks OR tasks they created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_tasks' 
    AND policyname = 'Users can view shared or own prayer tasks'
  ) THEN
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
  END IF;
END $$;

-- Also allow viewing tasks that user has a prayer_user_tasks instance for
-- This allows users to see their private tasks they've started
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_tasks' 
    AND policyname = 'Users can view tasks they have instances of'
  ) THEN
    CREATE POLICY "Users can view tasks they have instances of" 
    ON public.prayer_tasks 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.prayer_user_tasks 
        WHERE prayer_user_tasks.task_id = prayer_tasks.id
        AND (
          prayer_user_tasks.user_id = auth.uid() OR
          prayer_user_tasks.anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
    );
  END IF;
END $$;
