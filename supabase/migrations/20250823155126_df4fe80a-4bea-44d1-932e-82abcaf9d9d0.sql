-- Add verification status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN status TEXT DEFAULT 'unverified' CHECK (status IN ('unverified', 'pending_verification', 'verified', 'rejected', 'blocked'));

-- Create verification_requests table
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'more_info_required')),
  reason TEXT,
  documents JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_actions table for auditing
CREATE TABLE public.admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  verification_request_id UUID NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_more_info')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_requests
CREATE POLICY "Users can view their own verification requests" 
ON public.verification_requests 
FOR SELECT 
USING (
  user_id IN (
    SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own verification requests" 
ON public.verification_requests 
FOR INSERT 
WITH CHECK (
  user_id IN (
    SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own verification requests" 
ON public.verification_requests 
FOR UPDATE 
USING (
  user_id IN (
    SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- RLS Policies for admin_actions (read-only for regular users)
CREATE POLICY "Users can view admin actions on their requests" 
ON public.admin_actions 
FOR SELECT 
USING (
  user_id IN (
    SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX idx_admin_actions_user_id ON public.admin_actions(user_id);
CREATE INDEX idx_admin_actions_verification_request_id ON public.admin_actions(verification_request_id);