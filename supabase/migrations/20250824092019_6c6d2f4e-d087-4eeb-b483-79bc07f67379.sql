-- Create documents table for request attachments
CREATE TABLE public.request_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('proof_of_payment', 'identification', 'bank_statement', 'other')),
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.request_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for document access
CREATE POLICY "Users can view their own documents" 
ON public.request_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents" 
ON public.request_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.request_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for request documents
INSERT INTO storage.buckets (id, name, public) VALUES ('request-documents', 'request-documents', false);

-- Create storage policies for request documents
CREATE POLICY "Users can view their own request documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'request-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own request documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'request-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own request documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'request-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add indexes for better performance
CREATE INDEX idx_request_documents_request_id ON public.request_documents(request_id);
CREATE INDEX idx_request_documents_user_id ON public.request_documents(user_id);