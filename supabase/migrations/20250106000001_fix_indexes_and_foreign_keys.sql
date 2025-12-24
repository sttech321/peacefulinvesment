-- ============================================================================
-- FIX INDEXES AND FOREIGN KEYS
-- Addresses database linter warnings for performance optimization
-- ============================================================================

-- ============================================================================
-- CRITICAL: Add missing index on foreign key
-- ============================================================================
-- referral_signups.referral_id is a foreign key but has no index
-- This is critical for JOIN performance and CASCADE operations
CREATE INDEX IF NOT EXISTS idx_referral_signups_referral_id 
ON public.referral_signups(referral_id);

-- ============================================================================
-- KEEP INDEXES THAT ARE LIKELY NEEDED (for RLS policies and common queries)
-- These may show as "unused" but are important for:
-- 1. RLS policy evaluation
-- 2. Future query patterns
-- 3. Foreign key operations
-- ============================================================================

-- Keep user_id indexes - Critical for RLS policies
-- These are used by RLS policies even if not in query plans yet
-- idx_profiles_user_id - Used in profiles RLS policies
-- idx_user_roles_user_id - Used in admin checks
-- idx_requests_user_id - Used in requests RLS policies
-- idx_overseas_companies_user_id - Used in overseas_companies RLS policies
-- idx_overseas_company_requests_user_id - Used in RLS policies
-- idx_metatrader_accounts_user_id - Used in RLS policies
-- idx_referrals_user_id - Used in referrals RLS policies

-- Keep admin_id index - Used in admin_actions queries
-- idx_admin_actions_admin_id - Keep for admin queries

-- Keep blog indexes - Likely to be used
-- idx_blog_posts_author_status - For filtering by author and status
-- idx_blog_media_blog_post_id - For JOINs with blog_posts

-- Keep composite index for admin checks
-- idx_user_roles_user_role - Used by is_admin() function

-- ============================================================================
-- REMOVE TRULY UNUSED INDEXES (after careful consideration)
-- Only remove indexes that are:
-- 1. Not used by RLS policies
-- 2. Not on foreign keys
-- 3. Not likely to be used in future queries
-- ============================================================================

-- Remove unused status/type indexes if they're not in WHERE clauses
-- These might be used in the future, but if queries don't filter by them, they're overhead
-- Note: Be cautious - only remove if you're certain they won't be needed

-- Option 1: Remove them (uncomment if you want to remove)
-- DROP INDEX IF EXISTS public.idx_verification_requests_status;
-- DROP INDEX IF EXISTS public.idx_requests_status;
-- DROP INDEX IF EXISTS public.idx_requests_type;

-- Option 2: Keep them for future use (recommended)
-- These might be used as the application grows

-- ============================================================================
-- REMOVE DUPLICATE/REDUNDANT INDEXES
-- ============================================================================

-- overseas_companies has two user_id indexes - keep one, remove duplicate
DROP INDEX IF EXISTS public.overseas_companies_user_id_idx; -- Remove duplicate
-- Keep: idx_overseas_companies_user_id (created in previous migration)

-- blog_categories parent_id index - Keep if you query by parent_id
-- If not used, can be removed, but it's small so keeping is fine

-- ============================================================================
-- REMOVE OVERLY SPECIFIC INDEXES THAT ARE UNLIKELY TO BE USED
-- ============================================================================

-- blog_media has many specific indexes that may not be needed
-- Remove if not used in queries:
DROP INDEX IF EXISTS public.idx_blog_media_media_type; -- Unlikely to filter by type alone
DROP INDEX IF EXISTS public.idx_blog_media_uploaded_by; -- Can use blog_post_id index instead
DROP INDEX IF EXISTS public.idx_blog_media_post_id_uploaded_by; -- Composite might be overkill

-- Keep: idx_blog_media_blog_post_id (for JOINs) - if it exists, keep it

-- ============================================================================
-- REMOVE INDEXES ON AUDIT/LOG TABLES (if not frequently queried)
-- ============================================================================

-- Audit logs are typically written more than read
-- Remove indexes if you don't frequently query by these columns
-- DROP INDEX IF EXISTS public.idx_request_audit_log_user_id;
-- DROP INDEX IF EXISTS public.idx_request_audit_log_created_at;

-- Keep them if you query audit logs frequently

-- ============================================================================
-- REMOVE FEE_STRUCTURES LOOKUP INDEX (if calculate_request_fee function doesn't use it)
-- ============================================================================

-- This index might be used by the fee calculation function
-- Check if the function uses these columns in WHERE clause
-- If not, can be removed:
-- DROP INDEX IF EXISTS public.idx_fee_structures_lookup;

-- ============================================================================
-- ANALYZE TABLES AFTER INDEX CHANGES
-- ============================================================================
ANALYZE public.referral_signups;
ANALYZE public.overseas_companies;
ANALYZE public.blog_media;

-- ============================================================================
-- SUMMARY OF ACTIONS:
-- ============================================================================
-- ✅ ADDED: idx_referral_signups_referral_id (critical foreign key index)
-- ✅ KEPT: All user_id indexes (needed for RLS policies)
-- ✅ KEPT: idx_user_roles_user_role (needed for admin checks)
-- ✅ KEPT: idx_blog_posts_author_status (likely to be used)
-- ✅ REMOVED: Duplicate overseas_companies_user_id_idx
-- ✅ REMOVED: Unused blog_media indexes (media_type, uploaded_by, composite)
-- ⚠️  REVIEW: Status/type indexes - kept for now, remove if confirmed unused
-- ⚠️  REVIEW: Audit log indexes - kept for now, remove if not querying logs
-- ⚠️  REVIEW: Fee structures index - kept if used by function

