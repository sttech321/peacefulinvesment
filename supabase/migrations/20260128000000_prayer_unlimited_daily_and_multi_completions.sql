-- Prayer system upgrades:
-- 1) Allow multiple completions per day (store each completion as a row)
-- 2) Add unlimited daily schedule mode (no fixed number of days / no end date)
-- 3) Provide a helper to mark overdue prayer_tasks as "NOT DONE"

DO $$
BEGIN
  -- prayer_tasks: add schedule_mode (task template / default)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prayer_tasks'
      AND column_name = 'schedule_mode'
  ) THEN
    ALTER TABLE public.prayer_tasks
      ADD COLUMN schedule_mode TEXT NOT NULL DEFAULT 'FIXED'
      CHECK (schedule_mode IN ('FIXED', 'DAILY_UNLIMITED'));
  END IF;

  -- prayer_user_tasks: add schedule_mode (instance snapshot)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prayer_user_tasks'
      AND column_name = 'schedule_mode'
  ) THEN
    ALTER TABLE public.prayer_user_tasks
      ADD COLUMN schedule_mode TEXT NOT NULL DEFAULT 'FIXED'
      CHECK (schedule_mode IN ('FIXED', 'DAILY_UNLIMITED'));
  END IF;

  -- prayer_user_tasks: allow NULL end_date for unlimited daily prayers
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prayer_user_tasks'
      AND column_name = 'end_date'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.prayer_user_tasks
      ALTER COLUMN end_date DROP NOT NULL;
  END IF;
END $$;

-- Allow multiple completion rows per day:
-- Drop any UNIQUE constraints on prayer_daily_completions (historically enforced one completion/day).
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.prayer_daily_completions'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.prayer_daily_completions DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

-- Keep lookups fast for "has any completion for this day"
CREATE INDEX IF NOT EXISTS idx_prayer_daily_completions_user_task_day
  ON public.prayer_daily_completions(user_task_id, day_number);

-- can_complete_prayer_day:
-- - still prevents completing *future* days
-- - DOES NOT prevent multiple completions for the same day anymore
-- - supports unlimited daily mode (no end_date upper bound)
CREATE OR REPLACE FUNCTION public.can_complete_prayer_day(
  p_user_task_id UUID,
  p_day_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_tz TEXT;
  v_mode TEXT;
  v_today DATE;
  v_current_day INTEGER;
  v_duration INTEGER;
BEGIN
  SELECT
    start_date,
    end_date,
    COALESCE(timezone, 'UTC'),
    COALESCE(schedule_mode, 'FIXED')
  INTO v_start_date, v_end_date, v_tz, v_mode
  FROM public.prayer_user_tasks
  WHERE id = p_user_task_id;

  IF v_start_date IS NULL THEN
    RETURN false;
  END IF;

  IF p_day_number IS NULL OR p_day_number < 1 THEN
    RETURN false;
  END IF;

  -- Compute "today" in the task timezone; fall back to UTC on invalid timezone strings.
  BEGIN
    v_today := timezone(v_tz, now())::date;
  EXCEPTION WHEN others THEN
    v_today := timezone('UTC', now())::date;
  END;

  -- Calculate current day (1-based)
  v_current_day := v_today - v_start_date + 1;

  -- Cannot complete future days (relative to the user's timezone day boundary)
  IF p_day_number > v_current_day THEN
    RETURN false;
  END IF;

  -- Unlimited daily prayers have no upper bound.
  IF v_mode = 'DAILY_UNLIMITED' OR v_end_date IS NULL THEN
    RETURN true;
  END IF;

  -- Fixed prayers are bounded by end_date.
  v_duration := (v_end_date - v_start_date + 1);
  IF p_day_number > v_duration THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_current_prayer_day:
-- - uses stored timezone for day boundaries
-- - supports unlimited daily mode
CREATE OR REPLACE FUNCTION public.get_current_prayer_day(p_user_task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_tz TEXT;
  v_mode TEXT;
  v_today DATE;
  v_current_day INTEGER;
  v_duration INTEGER;
BEGIN
  SELECT
    start_date,
    end_date,
    COALESCE(timezone, 'UTC'),
    COALESCE(schedule_mode, 'FIXED')
  INTO v_start_date, v_end_date, v_tz, v_mode
  FROM public.prayer_user_tasks
  WHERE id = p_user_task_id;

  IF v_start_date IS NULL THEN
    RETURN 1;
  END IF;

  BEGIN
    v_today := timezone(v_tz, now())::date;
  EXCEPTION WHEN others THEN
    v_today := timezone('UTC', now())::date;
  END;

  v_current_day := v_today - v_start_date + 1;

  IF v_current_day < 1 THEN
    RETURN 0; -- Not started yet
  END IF;

  IF v_mode = 'DAILY_UNLIMITED' OR v_end_date IS NULL THEN
    RETURN v_current_day;
  END IF;

  v_duration := (v_end_date - v_start_date + 1);
  IF v_current_day > v_duration THEN
    RETURN v_duration;
  END IF;

  RETURN v_current_day;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper: mark overdue prayer_tasks as "NOT DONE".
-- This is intended to be called from cron/edge functions (best-effort).
CREATE OR REPLACE FUNCTION public.update_overdue_prayer_task_statuses()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.prayer_tasks
  SET status = 'NOT DONE'
  WHERE status = 'TODO'
    AND end_date IS NOT NULL
    AND end_date < timezone('UTC', now())::date;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

