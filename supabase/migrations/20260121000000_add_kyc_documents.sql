-- Create table to store identity/KYC documents uploaded during onboarding
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'drivers_license_front',
    'drivers_license_back',
    'passport',
    'bank_statement',
    'utility_bill'
  )),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Allow owners or admins to view their documents
CREATE POLICY kyc_documents_select
ON public.kyc_documents
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);

-- Allow owners or admins to insert documents
CREATE POLICY kyc_documents_insert
ON public.kyc_documents
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);

-- Allow owners or admins to update metadata
CREATE POLICY kyc_documents_update
ON public.kyc_documents
FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);

-- Allow owners or admins to delete documents
CREATE POLICY kyc_documents_delete
ON public.kyc_documents
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_document_type ON public.kyc_documents(document_type);

-- Create a dedicated storage bucket for KYC documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies to restrict access to owners and admins
CREATE POLICY "KYC documents select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "KYC documents insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "KYC documents delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kyc-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);
