-- Verification script to check if all prayer system tables exist
-- Run this in Supabase SQL Editor to verify your setup

-- 1. Check prayer_tasks table and columns
SELECT 
    'prayer_tasks' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'prayer_tasks'
ORDER BY ordinal_position;

-- 2. Check if prayer_user_tasks table exists
SELECT 
    'prayer_user_tasks' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'prayer_user_tasks'
ORDER BY ordinal_position;

-- 3. Check if prayer_daily_completions table exists
SELECT 
    'prayer_daily_completions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'prayer_daily_completions'
ORDER BY ordinal_position;

-- 4. Check if prayer_folders table exists
SELECT 
    'prayer_folders' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'prayer_folders'
ORDER BY ordinal_position;

-- 5. Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('prayer_tasks', 'prayer_user_tasks', 'prayer_daily_completions', 'prayer_folders')
ORDER BY tablename, policyname;

-- 6. Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name IN (
    'calculate_prayer_end_date',
    'get_current_prayer_day',
    'can_complete_prayer_day',
    'update_updated_at_column'
)
ORDER BY routine_name;

-- 7. Summary: Count tables
SELECT 
    COUNT(*) as total_tables,
    STRING_AGG(table_name, ', ') as table_names
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN (
    'prayer_tasks',
    'prayer_folders',
    'prayer_user_tasks',
    'prayer_daily_completions'
);
