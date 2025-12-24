-- ============================================================================
-- FIX AUTH RLS INITPLAN AND REMOVE DUPLICATE POLICIES
-- This migration fixes critical performance issues:
-- 1. Replaces auth.uid() with (select auth.uid()) to evaluate once per query
-- 2. Removes duplicate policies that cause multiple evaluations
-- ============================================================================

-- ============================================================================
-- PROFILES - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Optimized SELECT policy (evaluates auth.uid() once)
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Optimized UPDATE policy
CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Optimized INSERT policy
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- VERIFICATION_REQUESTS - Fix auth.uid() calls
-- ============================================================================
DROP POLICY IF EXISTS "verification_requests_select" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_insert" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_update" ON public.verification_requests;

CREATE POLICY "verification_requests_select"
ON public.verification_requests
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

CREATE POLICY "verification_requests_insert"
ON public.verification_requests
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

CREATE POLICY "verification_requests_update"
ON public.verification_requests
FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- ADMIN_ACTIONS - Fix auth.uid() and remove duplicate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_select" ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_insert" ON public.admin_actions;

-- Single optimized SELECT policy
CREATE POLICY "admin_actions_select"
ON public.admin_actions
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR (select auth.uid()) = admin_id 
  OR public.is_admin((select auth.uid()))
);

-- Optimized INSERT policy
CREATE POLICY "admin_actions_insert"
ON public.admin_actions
FOR INSERT
WITH CHECK (public.is_admin((select auth.uid())));

-- ============================================================================
-- METATRADER_ACCOUNTS - Fix auth.uid() calls
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own MetaTrader accounts" ON public.metatrader_accounts;
DROP POLICY IF EXISTS "Users can create their own MetaTrader accounts" ON public.metatrader_accounts;
DROP POLICY IF EXISTS "Users can update their own MetaTrader accounts" ON public.metatrader_accounts;
DROP POLICY IF EXISTS "Users can delete their own MetaTrader accounts" ON public.metatrader_accounts;

CREATE POLICY "metatrader_accounts_select"
ON public.metatrader_accounts
FOR SELECT
USING ((select auth.uid()) = user_id);

CREATE POLICY "metatrader_accounts_insert"
ON public.metatrader_accounts
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "metatrader_accounts_update"
ON public.metatrader_accounts
FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "metatrader_accounts_delete"
ON public.metatrader_accounts
FOR DELETE
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- OVERSEAS_COMPANY_REQUESTS - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own company requests" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "Users can create their own company requests" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "Users can update their own company requests" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "overseas_company_requests_select" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "overseas_company_requests_update" ON public.overseas_company_requests;

-- Single optimized SELECT policy
CREATE POLICY "overseas_company_requests_select"
ON public.overseas_company_requests
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "overseas_company_requests_insert"
ON public.overseas_company_requests
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Single optimized UPDATE policy
CREATE POLICY "overseas_company_requests_update"
ON public.overseas_company_requests
FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- OVERSEAS_COMPANIES - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own companies" ON public.overseas_companies;
DROP POLICY IF EXISTS "overseas_companies_select" ON public.overseas_companies;
DROP POLICY IF EXISTS "overseas_companies_insert" ON public.overseas_companies;
DROP POLICY IF EXISTS "overseas_companies_update" ON public.overseas_companies;

-- Single optimized SELECT policy
CREATE POLICY "overseas_companies_select"
ON public.overseas_companies
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "overseas_companies_insert"
ON public.overseas_companies
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized UPDATE policy
CREATE POLICY "overseas_companies_update"
ON public.overseas_companies
FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- REFERRALS - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "referrals_admin" ON public.referrals;

-- Single optimized SELECT policy
CREATE POLICY "referrals_select"
ON public.referrals
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "referrals_insert"
ON public.referrals
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized UPDATE policy
CREATE POLICY "referrals_update"
ON public.referrals
FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- REFERRAL_PAYMENTS - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view payments for their referrals" ON public.referral_payments;
DROP POLICY IF EXISTS "Allow payment inserts" ON public.referral_payments;
DROP POLICY IF EXISTS "referral_payments_admin" ON public.referral_payments;

-- Single optimized SELECT policy
CREATE POLICY "referral_payments_select"
ON public.referral_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_payments.referral_id 
    AND referrals.user_id = (select auth.uid())
  )
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "referral_payments_insert"
ON public.referral_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_payments.referral_id 
    AND referrals.user_id = (select auth.uid())
  )
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- REFERRAL_SIGNUPS - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view signups for their referrals" ON public.referral_signups;
DROP POLICY IF EXISTS "Allow signup tracking" ON public.referral_signups;
DROP POLICY IF EXISTS "referral_signups_admin" ON public.referral_signups;

-- Single optimized SELECT policy
CREATE POLICY "referral_signups_select"
ON public.referral_signups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_signups.referral_id 
    AND referrals.user_id = (select auth.uid())
  )
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "referral_signups_insert"
ON public.referral_signups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_signups.referral_id 
    AND referrals.user_id = (select auth.uid())
  )
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- REQUESTS - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "requests_select" ON public.requests;
DROP POLICY IF EXISTS "requests_update" ON public.requests;

-- Single optimized SELECT policy
CREATE POLICY "requests_select"
ON public.requests
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "requests_insert"
ON public.requests
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Single optimized UPDATE policy
CREATE POLICY "requests_update"
ON public.requests
FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- REQUEST_DOCUMENTS - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own documents" ON public.request_documents;
DROP POLICY IF EXISTS "Users can upload their own documents" ON public.request_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.request_documents;
DROP POLICY IF EXISTS "request_documents_select" ON public.request_documents;
DROP POLICY IF EXISTS "request_documents_insert" ON public.request_documents;
DROP POLICY IF EXISTS "request_documents_delete" ON public.request_documents;

-- Single optimized SELECT policy
CREATE POLICY "request_documents_select"
ON public.request_documents
FOR SELECT
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "request_documents_insert"
ON public.request_documents
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized DELETE policy
CREATE POLICY "request_documents_delete"
ON public.request_documents
FOR DELETE
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- REQUEST_AUDIT_LOG - Fix auth.uid()
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.request_audit_log;

CREATE POLICY "request_audit_log_select"
ON public.request_audit_log
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- USER_ROLES - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Single optimized SELECT policy
CREATE POLICY "user_roles_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = user_id 
  OR public.is_admin((select auth.uid()))
);

-- Optimized ALL policy for admins (covers INSERT, UPDATE, DELETE)
CREATE POLICY "user_roles_admin"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())));

-- ============================================================================
-- BLOG_POSTS - Fix auth.uid() calls
-- ============================================================================
DROP POLICY IF EXISTS "blog_posts_select" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_insert" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete" ON public.blog_posts;

CREATE POLICY "blog_posts_select"
ON public.blog_posts
FOR SELECT
USING (
  status = 'published' 
  OR (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

CREATE POLICY "blog_posts_insert"
ON public.blog_posts
FOR INSERT
WITH CHECK (
  (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

CREATE POLICY "blog_posts_update"
ON public.blog_posts
FOR UPDATE
USING (
  (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

CREATE POLICY "blog_posts_delete"
ON public.blog_posts
FOR DELETE
USING (
  (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

-- ============================================================================
-- BLOG_CATEGORIES - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "blog_categories_select" ON public.blog_categories;
DROP POLICY IF EXISTS "blog_categories_admin" ON public.blog_categories;

-- Single SELECT policy (public read)
CREATE POLICY "blog_categories_select"
ON public.blog_categories
FOR SELECT
USING (true);

-- Single admin management policy
CREATE POLICY "blog_categories_admin"
ON public.blog_categories
FOR ALL
TO authenticated
USING (public.is_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())));

-- ============================================================================
-- BLOG_MEDIA - Fix auth.uid() and remove duplicates
-- ============================================================================
DROP POLICY IF EXISTS "blog_media_select" ON public.blog_media;
DROP POLICY IF EXISTS "blog_media_write" ON public.blog_media;

CREATE POLICY "blog_media_select"
ON public.blog_media
FOR SELECT
USING (true);

CREATE POLICY "blog_media_write"
ON public.blog_media
FOR ALL
TO authenticated
USING (
  public.is_admin((select auth.uid())) 
  OR EXISTS (
    SELECT 1 FROM public.blog_posts 
    WHERE blog_posts.id = blog_media.blog_post_id 
    AND blog_posts.author_id = (select auth.uid())
  )
)
WITH CHECK (
  public.is_admin((select auth.uid())) 
  OR EXISTS (
    SELECT 1 FROM public.blog_posts 
    WHERE blog_posts.id = blog_media.blog_post_id 
    AND blog_posts.author_id = (select auth.uid())
  )
);

-- ============================================================================
-- CONTACT_REQUESTS - Fix auth.uid() calls
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admins can update all contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admins can delete all contact requests" ON public.contact_requests;

CREATE POLICY "contact_requests_admin_select"
ON public.contact_requests
FOR SELECT
USING (public.is_admin((select auth.uid())));

CREATE POLICY "contact_requests_admin_update"
ON public.contact_requests
FOR UPDATE
USING (public.is_admin((select auth.uid())));

CREATE POLICY "contact_requests_admin_delete"
ON public.contact_requests
FOR DELETE
USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- APP_SETTINGS - Fix auth.uid() calls
-- ============================================================================
DROP POLICY IF EXISTS "Admin can view all app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin can delete app settings" ON public.app_settings;

CREATE POLICY "app_settings_admin"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.is_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())));

-- ============================================================================
-- ANALYZE TABLES AFTER POLICY CHANGES
-- ============================================================================
ANALYZE public.profiles;
ANALYZE public.requests;
ANALYZE public.referrals;
ANALYZE public.user_roles;
ANALYZE public.blog_posts;

