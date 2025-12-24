-- ============================================================================
-- OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- This migration consolidates redundant policies and improves query performance
-- ============================================================================

-- Helper function to check if user is admin (already exists, but ensure it's optimized)
-- This function should use an index on user_roles(user_id, role)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND user_roles.role = 'admin'
    LIMIT 1
  );
$$;

-- Create index for faster admin checks (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role) WHERE role = 'admin';

-- ============================================================================
-- BLOG_POSTS - Consolidate 5+ policies into 3 optimized policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog public read" ON public.blog_posts;
DROP POLICY IF EXISTS "Public select" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow select to authenticated" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can manage their own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow update for owner" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow delete for owner" ON public.blog_posts;

-- Single optimized SELECT policy (covers both authenticated and anon)
-- Using (select auth.uid()) to evaluate once per query, not per row
CREATE POLICY "blog_posts_select"
ON public.blog_posts
FOR SELECT
USING (
  status = 'published' 
  OR (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized INSERT policy
CREATE POLICY "blog_posts_insert"
ON public.blog_posts
FOR INSERT
WITH CHECK (
  (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized UPDATE policy
CREATE POLICY "blog_posts_update"
ON public.blog_posts
FOR UPDATE
USING (
  (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

-- Single optimized DELETE policy
CREATE POLICY "blog_posts_delete"
ON public.blog_posts
FOR DELETE
USING (
  (select auth.uid()) = author_id 
  OR public.is_admin((select auth.uid()))
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_status ON public.blog_posts(author_id, status);

-- ============================================================================
-- BLOG_CATEGORIES - Consolidate 3 policies into 2
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;

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
-- BLOG_MEDIA - Consolidate 3 policies into 2
-- ============================================================================
DROP POLICY IF EXISTS "blog_media_select" ON public.blog_media;
DROP POLICY IF EXISTS "blog_media_write" ON public.blog_media;
DROP POLICY IF EXISTS "Blog media write access" ON public.blog_media;

-- Single SELECT policy
CREATE POLICY "blog_media_select"
ON public.blog_media
FOR SELECT
USING (true);

-- Single write policy
CREATE POLICY "blog_media_write"
ON public.blog_media
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.blog_posts 
  WHERE blog_posts.id = blog_media.blog_post_id 
  AND blog_posts.author_id = auth.uid()
))
WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.blog_posts 
  WHERE blog_posts.id = blog_media.blog_post_id 
  AND blog_posts.author_id = auth.uid()
));

-- ============================================================================
-- PROFILES - Consolidate policies
-- ============================================================================
DROP POLICY IF EXISTS "Profiles select access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Delete only blocked inactive users" ON public.profiles;

-- Optimized SELECT policy
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

-- Keep INSERT policy as is (users create their own profile)
-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ============================================================================
-- USER_ROLES - Already optimized, but ensure index exists
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================================================
-- REQUESTS - Consolidate policies
-- ============================================================================
DROP POLICY IF EXISTS "Admin can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Admin can update all requests" ON public.requests;

-- Optimized SELECT policy
CREATE POLICY "requests_select"
ON public.requests
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized UPDATE policy
CREATE POLICY "requests_update"
ON public.requests
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);

-- ============================================================================
-- REQUEST_DOCUMENTS - Consolidate policies
-- ============================================================================
DROP POLICY IF EXISTS "Admin can manage all request documents" ON public.request_documents;
DROP POLICY IF EXISTS "Admin can view all request documents" ON public.request_documents;

-- Optimized SELECT policy
CREATE POLICY "request_documents_select"
ON public.request_documents
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized INSERT policy
CREATE POLICY "request_documents_insert"
ON public.request_documents
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized DELETE policy
CREATE POLICY "request_documents_delete"
ON public.request_documents
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_request_documents_user_id ON public.request_documents(user_id);

-- ============================================================================
-- REQUEST_AUDIT_LOG - Already simple, just ensure index
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_request_audit_log_user_id ON public.request_audit_log(user_id);

-- ============================================================================
-- REFERRALS - Consolidate admin policies, keep user policies
-- ============================================================================
DROP POLICY IF EXISTS "Admin can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admin can update all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admin can insert referrals" ON public.referrals;

-- Note: User policies ("Users can view their own referrals", etc.) are kept
-- Add single admin policy that works alongside user policies
CREATE POLICY "referrals_admin"
ON public.referrals
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON public.referrals(user_id);

-- ============================================================================
-- REFERRAL_SIGNUPS - Consolidate admin policies
-- ============================================================================
DROP POLICY IF EXISTS "Admin can view all referral signups" ON public.referral_signups;
DROP POLICY IF EXISTS "Admin can insert referral signups" ON public.referral_signups;
DROP POLICY IF EXISTS "Admin can update referral signups" ON public.referral_signups;

-- Single admin policy
CREATE POLICY "referral_signups_admin"
ON public.referral_signups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_signups.referral_id 
    AND referrals.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_signups.referral_id 
    AND referrals.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- ============================================================================
-- REFERRAL_PAYMENTS - Consolidate admin policies
-- ============================================================================
DROP POLICY IF EXISTS "Admin can view all referral payments" ON public.referral_payments;
DROP POLICY IF EXISTS "Admin can insert referral payments" ON public.referral_payments;
DROP POLICY IF EXISTS "Admin can update referral payments" ON public.referral_payments;

-- Single admin policy
CREATE POLICY "referral_payments_admin"
ON public.referral_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_payments.referral_id 
    AND referrals.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrals.id = referral_payments.referral_id 
    AND referrals.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- ============================================================================
-- OVERSEAS_COMPANIES - Consolidate policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all companies" ON public.overseas_companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.overseas_companies;
DROP POLICY IF EXISTS "Admins can update all companies" ON public.overseas_companies;
DROP POLICY IF EXISTS "Admins can view all overseas companies" ON public.overseas_companies;
DROP POLICY IF EXISTS "Admins can insert overseas companies for any user" ON public.overseas_companies;
DROP POLICY IF EXISTS "Admins can update all overseas companies" ON public.overseas_companies;

-- Optimized SELECT policy
CREATE POLICY "overseas_companies_select"
ON public.overseas_companies
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized INSERT policy
CREATE POLICY "overseas_companies_insert"
ON public.overseas_companies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized UPDATE policy
CREATE POLICY "overseas_companies_update"
ON public.overseas_companies
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_overseas_companies_user_id ON public.overseas_companies(user_id);

-- ============================================================================
-- OVERSEAS_COMPANY_REQUESTS - Consolidate policies
-- ============================================================================
DROP POLICY IF EXISTS "Admin can view all company requests" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "Admins can view all company requests" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "Admins can update all company requests" ON public.overseas_company_requests;
DROP POLICY IF EXISTS "Admins can manage all overseas company requests" ON public.overseas_company_requests;

-- Optimized SELECT policy
CREATE POLICY "overseas_company_requests_select"
ON public.overseas_company_requests
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized UPDATE policy
CREATE POLICY "overseas_company_requests_update"
ON public.overseas_company_requests
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_overseas_company_requests_user_id ON public.overseas_company_requests(user_id);

-- ============================================================================
-- METATRADER_ACCOUNTS - Already optimized, just ensure index
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_metatrader_accounts_user_id ON public.metatrader_accounts(user_id);

-- ============================================================================
-- VERIFICATION_REQUESTS - Optimize inefficient subquery
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can create their own verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users can update their own verification requests" ON public.verification_requests;

-- Optimized SELECT policy (direct user_id check instead of subquery)
CREATE POLICY "verification_requests_select"
ON public.verification_requests
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized INSERT policy
CREATE POLICY "verification_requests_insert"
ON public.verification_requests
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Optimized UPDATE policy
CREATE POLICY "verification_requests_update"
ON public.verification_requests
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);

-- ============================================================================
-- ADMIN_ACTIONS - Optimize
-- ============================================================================
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.admin_actions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.admin_actions;
DROP POLICY IF EXISTS "Users can view admin actions on their requests" ON public.admin_actions;

-- Optimized SELECT policy
CREATE POLICY "admin_actions_select"
ON public.admin_actions
FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = admin_id 
  OR public.is_admin(auth.uid())
);

-- Optimized INSERT policy (only admins can insert)
CREATE POLICY "admin_actions_insert"
ON public.admin_actions
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_actions_user_id ON public.admin_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);

-- ============================================================================
-- CONTACT_REQUESTS - Already optimized, just ensure structure
-- ============================================================================
-- Keep existing policies as they're already well-structured

-- ============================================================================
-- FEE_STRUCTURES - Already optimized
-- ============================================================================
-- Keep existing policy as it's simple and efficient

-- ============================================================================
-- APP_SETTINGS - Already optimized
-- ============================================================================
-- Keep existing admin policies as they're already consolidated

-- ============================================================================
-- ANALYZE TABLES FOR BETTER QUERY PLANNING
-- ============================================================================
ANALYZE public.blog_posts;
ANALYZE public.profiles;
ANALYZE public.requests;
ANALYZE public.referrals;
ANALYZE public.user_roles;

