-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admin can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Admin can update all requests" ON public.requests;
DROP POLICY IF EXISTS "Admin can view all request documents" ON public.request_documents;
DROP POLICY IF EXISTS "Admin can manage all request documents" ON public.request_documents;

-- Create policies for admin to view all requests
CREATE POLICY "Admin can view all requests" 
ON public.requests 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create policies for admin to update all requests
CREATE POLICY "Admin can update all requests" 
ON public.requests 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- If request_documents table exists, add policies for it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'request_documents') THEN
    -- Create policies for admin to view all request documents
    CREATE POLICY "Admin can view all request documents" 
    ON public.request_documents 
    FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

    -- Create policies for admin to manage all request documents
    CREATE POLICY "Admin can manage all request documents" 
    ON public.request_documents 
    FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

