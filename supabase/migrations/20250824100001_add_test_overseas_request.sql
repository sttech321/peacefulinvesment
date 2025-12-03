-- Insert a test overseas company request (only if a user with role='user' exists)
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
  p.id, -- or p.user_id depending on your schema!
  ARRAY['Test Company Ltd', 'Test Corp International'],
  'United Kingdom',
  'LLC',
  'A test company for development purposes',
  p.email,
  'pending',
  NOW()
FROM public.profiles p
WHERE p.role = 'user'
LIMIT 1;
