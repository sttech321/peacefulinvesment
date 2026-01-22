-- Use the prayer's stored timezone when determining whether a day can be completed.
-- This prevents "Day 0 / Not started yet" confusion for users in non-UTC timezones.

CREATE OR REPLACE FUNCTION public.can_complete_prayer_day(
  p_user_task_id UUID,
  p_day_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_start_date DATE;
  v_duration INTEGER;
  v_tz TEXT;
  v_today DATE;
  v_current_day INTEGER;
  v_already_completed BOOLEAN;
BEGIN
  -- Get task details (timezone stored per user task)
  SELECT start_date, (end_date - start_date + 1), COALESCE(timezone, 'UTC')
  INTO v_start_date, v_duration, v_tz
  FROM public.prayer_user_tasks
  WHERE id = p_user_task_id;

  IF v_start_date IS NULL THEN
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

  -- Check if day is already completed
  SELECT EXISTS(
    SELECT 1 FROM public.prayer_daily_completions
    WHERE user_task_id = p_user_task_id
      AND day_number = p_day_number
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN false;
  END IF;

  -- Check if day is within valid range
  IF p_day_number < 1 OR p_day_number > v_duration THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

