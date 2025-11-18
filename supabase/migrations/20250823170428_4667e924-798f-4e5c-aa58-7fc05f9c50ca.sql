-- Create overseas company requests table
CREATE TABLE public.overseas_company_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_names TEXT[] NOT NULL,
  jurisdiction TEXT NOT NULL,
  business_type TEXT NOT NULL,
  business_description TEXT,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estimated_completion TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  documents_requested TEXT[],
  selected_company_name TEXT,
  uploaded_documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create overseas companies table
CREATE TABLE public.overseas_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  incorporation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  jurisdiction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for overseas company documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('overseas-company-documents', 'overseas-company-documents', false);

-- Enable RLS on both tables
ALTER TABLE public.overseas_company_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overseas_companies ENABLE ROW LEVEL SECURITY;

-- RLS policies for overseas_company_requests
CREATE POLICY "Users can view their own company requests" 
ON public.overseas_company_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company requests" 
ON public.overseas_company_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company requests" 
ON public.overseas_company_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for overseas_companies
CREATE POLICY "Users can view their own companies" 
ON public.overseas_companies 
FOR SELECT 
USING (auth.uid() = user_id);

-- Storage policies for overseas company documents
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'overseas-company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'overseas-company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'overseas-company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'overseas-company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add triggers for updated_at columns
CREATE TRIGGER update_overseas_company_requests_updated_at
  BEFORE UPDATE ON public.overseas_company_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_overseas_companies_updated_at
  BEFORE UPDATE ON public.overseas_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();