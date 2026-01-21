-- ============================================================================
-- KYC DOCUMENTS: table + RLS + Storage policies
-- Bucket: kyc-documents (private)
-- Path format: users/{user_id}/{document_type}.{ext}
-- ============================================================================

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create table if missing (some environments may have been created manually)
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_doc_type ON public.kyc_documents(user_id, document_type);

-- Enable RLS
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Drop old policies (if any)
DROP POLICY IF EXISTS "kyc_documents_select" ON public.kyc_documents;
DROP POLICY IF EXISTS "kyc_documents_insert" ON public.kyc_documents;
DROP POLICY IF EXISTS "kyc_documents_delete" ON public.kyc_documents;
DROP POLICY IF EXISTS "kyc_documents_update" ON public.kyc_documents;

-- Allow users to read their own rows (and admins)
CREATE POLICY "kyc_documents_select"
ON public.kyc_documents
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = user_id
  OR public.is_admin((select auth.uid()))
);

-- Allow users to insert their own rows (and admins)
CREATE POLICY "kyc_documents_insert"
ON public.kyc_documents
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = user_id
  OR public.is_admin((select auth.uid()))
);

-- Allow users to delete their own rows (and admins)
CREATE POLICY "kyc_documents_delete"
ON public.kyc_documents
FOR DELETE
TO authenticated
USING (
  (select auth.uid()) = user_id
  OR public.is_admin((select auth.uid()))
);

-- Optional: allow admins to update rows (users typically don't need UPDATE)
CREATE POLICY "kyc_documents_update"
ON public.kyc_documents
FOR UPDATE
TO authenticated
USING (public.is_admin((select auth.uid())))
WITH CHECK (public.is_admin((select auth.uid())));

-- ============================================================================
-- Storage policies for bucket kyc-documents
-- NOTE: name = 'users/{user_id}/{document_type}.{ext}'
-- so split_part(name,'/',2) is {user_id}
-- ============================================================================

-- Drop old policies (if any)
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 2) = (select auth.uid())::text
);

CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 2) = (select auth.uid())::text
);

-- Needed for `upload(..., { upsert: true })`
CREATE POLICY "Users can update their own KYC documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 2) = (select auth.uid())::text
);

CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND split_part(name, '/', 2) = (select auth.uid())::text
);

