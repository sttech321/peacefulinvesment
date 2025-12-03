-- Add profile completion tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_completed_profile BOOLEAN NOT NULL DEFAULT FALSE;

-- Add additional profile fields for the onboarding form
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT,
ADD COLUMN employment_status TEXT,
ADD COLUMN employer TEXT,
ADD COLUMN annual_income INTEGER,
ADD COLUMN investment_experience TEXT,
ADD COLUMN risk_tolerance TEXT,
ADD COLUMN investment_goals TEXT[],
ADD COLUMN documents_uploaded BOOLEAN DEFAULT FALSE;
ADD COLUMN IF NOT EXISTS is_usa_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS overseas_company_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS overseas_company_completed boolean DEFAULT false;
