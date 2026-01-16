-- Extend prayer_tasks table with new fields
-- Use DO block to safely add columns and set defaults
DO $$
BEGIN
  -- Add duration_days column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prayer_tasks' 
    AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE public.prayer_tasks ADD COLUMN duration_days INTEGER;
  END IF;

  -- Add end_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prayer_tasks' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.prayer_tasks ADD COLUMN end_date DATE;
  END IF;

  -- Add is_shared column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prayer_tasks' 
    AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE public.prayer_tasks ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add blog_post_id column if it doesn't exist (only if blog_posts table exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prayer_tasks' 
    AND column_name = 'blog_post_id'
  ) THEN
    -- Check if blog_posts table exists before adding foreign key
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'blog_posts'
    ) THEN
      ALTER TABLE public.prayer_tasks 
      ADD COLUMN blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE public.prayer_tasks ADD COLUMN blog_post_id UUID;
    END IF;
  END IF;
END $$;

-- Set duration_days to number_of_days for existing records that have NULL
UPDATE public.prayer_tasks 
SET duration_days = number_of_days 
WHERE duration_days IS NULL;

-- Set default and NOT NULL constraint for duration_days (only if column exists and is nullable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prayer_tasks' 
    AND column_name = 'duration_days'
    AND is_nullable = 'YES'
  ) THEN
    -- First set default
    ALTER TABLE public.prayer_tasks ALTER COLUMN duration_days SET DEFAULT 9;
    -- Then set NOT NULL (this will work because we updated NULL values above)
    ALTER TABLE public.prayer_tasks ALTER COLUMN duration_days SET NOT NULL;
  END IF;
END $$;

-- Create function to calculate end_date from start_date + duration_days
CREATE OR REPLACE FUNCTION public.calculate_prayer_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.duration_days IS NOT NULL THEN
    NEW.end_date := NEW.start_date + (NEW.duration_days - 1) * INTERVAL '1 day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate end_date
DROP TRIGGER IF EXISTS trigger_calculate_prayer_end_date ON public.prayer_tasks;
CREATE TRIGGER trigger_calculate_prayer_end_date
BEFORE INSERT OR UPDATE ON public.prayer_tasks
FOR EACH ROW
EXECUTE FUNCTION public.calculate_prayer_end_date();

-- Create prayer_user_tasks table for user-specific prayer instances
CREATE TABLE IF NOT EXISTS public.prayer_user_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.prayer_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_user_id TEXT, -- For non-logged-in users (email-based identifier)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  person_needs_help TEXT,
  prayer_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure either user_id or anonymous_user_id is set
  CONSTRAINT check_user_identifier CHECK (
    (user_id IS NOT NULL) OR (anonymous_user_id IS NOT NULL)
  )
);

-- Create daily_completions table for tracking daily progress
CREATE TABLE IF NOT EXISTS public.prayer_daily_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_task_id UUID NOT NULL REFERENCES public.prayer_user_tasks(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one completion per day per user task
  UNIQUE(user_task_id, day_number)
);

-- Enable Row Level Security
ALTER TABLE public.prayer_user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_daily_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prayer_user_tasks
-- Users can view their own tasks and shared tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_user_tasks' 
    AND policyname = 'Users can view their own prayer tasks'
  ) THEN
    CREATE POLICY "Users can view their own prayer tasks" 
    ON public.prayer_user_tasks 
    FOR SELECT 
    USING (
      user_id = auth.uid() OR
      anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email' OR
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
  END IF;
END $$;

-- Users can create their own prayer instances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_user_tasks' 
    AND policyname = 'Users can create prayer instances'
  ) THEN
    CREATE POLICY "Users can create prayer instances" 
    ON public.prayer_user_tasks 
    FOR INSERT 
    WITH CHECK (
      user_id = auth.uid() OR
      anonymous_user_id IS NOT NULL
    );
  END IF;
END $$;

-- Users can update their own prayer instances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_user_tasks' 
    AND policyname = 'Users can update their own prayer instances'
  ) THEN
    CREATE POLICY "Users can update their own prayer instances" 
    ON public.prayer_user_tasks 
    FOR UPDATE 
    USING (
      user_id = auth.uid() OR
      anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email' OR
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
    );
  END IF;
END $$;

-- RLS Policies for prayer_daily_completions
-- Users can view completions for their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_daily_completions' 
    AND policyname = 'Users can view their own completions'
  ) THEN
    CREATE POLICY "Users can view their own completions" 
    ON public.prayer_daily_completions 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.prayer_user_tasks put
        WHERE put.id = prayer_daily_completions.user_task_id
        AND (
          put.user_id = auth.uid() OR
          put.anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email'
        )
      ) OR
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
    );
  END IF;
END $$;

-- Users can create completions for their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'prayer_daily_completions' 
    AND policyname = 'Users can create their own completions'
  ) THEN
    CREATE POLICY "Users can create their own completions" 
    ON public.prayer_daily_completions 
    FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.prayer_user_tasks put
        WHERE put.id = prayer_daily_completions.user_task_id
        AND (
          put.user_id = auth.uid() OR
          put.anonymous_user_id = current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
    );
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_user_tasks_task_id ON public.prayer_user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_prayer_user_tasks_user_id ON public.prayer_user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_user_tasks_anonymous_id ON public.prayer_user_tasks(anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_user_tasks_start_date ON public.prayer_user_tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_prayer_user_tasks_is_active ON public.prayer_user_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_prayer_daily_completions_user_task_id ON public.prayer_daily_completions(user_task_id);
CREATE INDEX IF NOT EXISTS idx_prayer_daily_completions_day ON public.prayer_daily_completions(day_number);
CREATE INDEX IF NOT EXISTS idx_prayer_tasks_is_shared ON public.prayer_tasks(is_shared);
CREATE INDEX IF NOT EXISTS idx_prayer_tasks_duration_days ON public.prayer_tasks(duration_days);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_prayer_user_tasks_updated_at ON public.prayer_user_tasks;
CREATE TRIGGER update_prayer_user_tasks_updated_at
BEFORE UPDATE ON public.prayer_user_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get current day for a user task
CREATE OR REPLACE FUNCTION public.get_current_prayer_day(p_user_task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_start_date DATE;
  v_duration INTEGER;
  v_current_day INTEGER;
BEGIN
  SELECT start_date, (end_date - start_date + 1) INTO v_start_date, v_duration
  FROM public.prayer_user_tasks
  WHERE id = p_user_task_id;
  
  IF v_start_date IS NULL THEN
    RETURN 1;
  END IF;
  
  v_current_day := CURRENT_DATE - v_start_date + 1;
  
  -- Ensure day is within valid range
  IF v_current_day < 1 THEN
    RETURN 0; -- Not started yet
  ELSIF v_current_day > v_duration THEN
    RETURN v_duration; -- Completed
  ELSE
    RETURN v_current_day;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to check if a day can be marked as completed
CREATE OR REPLACE FUNCTION public.can_complete_prayer_day(
  p_user_task_id UUID,
  p_day_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_start_date DATE;
  v_duration INTEGER;
  v_current_day INTEGER;
  v_already_completed BOOLEAN;
BEGIN
  -- Get task details
  SELECT start_date, (end_date - start_date + 1) INTO v_start_date, v_duration
  FROM public.prayer_user_tasks
  WHERE id = p_user_task_id;
  
  IF v_start_date IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate current day
  v_current_day := CURRENT_DATE - v_start_date + 1;
  
  -- Check if day is in the past or today
  IF p_day_number > v_current_day THEN
    RETURN false; -- Cannot complete future days
  END IF;
  
  -- Check if day is already completed
  SELECT EXISTS(
    SELECT 1 FROM public.prayer_daily_completions
    WHERE user_task_id = p_user_task_id
    AND day_number = p_day_number
  ) INTO v_already_completed;
  
  IF v_already_completed THEN
    RETURN false; -- Already completed
  END IF;
  
  -- Check if day is within valid range
  IF p_day_number < 1 OR p_day_number > v_duration THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;
