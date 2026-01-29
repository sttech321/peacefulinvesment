-- Add a flexible prayer frequency (times per day) per user prayer instance.
-- Safe to run multiple times.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prayer_user_tasks'
      AND column_name = 'times_per_day'
  ) THEN
    ALTER TABLE public.prayer_user_tasks
      ADD COLUMN times_per_day INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- Ensure a sane lower bound constraint exists.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prayer_user_tasks_times_per_day_check'
  ) THEN
    ALTER TABLE public.prayer_user_tasks
      ADD CONSTRAINT prayer_user_tasks_times_per_day_check CHECK (times_per_day >= 1);
  END IF;
END $$;

