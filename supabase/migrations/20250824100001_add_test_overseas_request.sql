-- Insert a test overseas company request (only if no requests exist)
INSERT INTO public.overseas_company_requests (
  user_id,
  company_names,
  jurisdiction,
  business_type,
  business_description,
  contact_email,
  status,
  submitted_at
)
SELECT 
  profiles.user_id,
  ARRAY['Test Company Ltd', 'Test Corp International'],
  'United Kingdom',
  'LLC',
  'A test company for development purposes',
  profiles.email,
  'pending',
  NOW()
FROM public.profiles 
WHERE profiles.role = 'user' 
LIMIT 1
ON CONFLICT DO NOTHING;
