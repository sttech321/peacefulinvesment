-- Create app_settings table for application-wide configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can view all app settings" 
ON public.app_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin can delete app settings" 
ON public.app_settings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- Insert default setting for deposit/withdrawal notification email (optional)
-- Uncomment and set your email if you want a default value
-- INSERT INTO public.app_settings (key, value, description)
-- VALUES (
--   'deposit_withdrawal_notification_email',
--   'admin@example.com',
--   'Email address to receive notifications when deposit/withdrawal requests are approved or declined'
-- )
-- ON CONFLICT (key) DO NOTHING;

