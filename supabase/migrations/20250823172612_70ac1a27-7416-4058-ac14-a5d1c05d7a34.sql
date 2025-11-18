-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referral_link TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'earning', 'completed')),
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  year_to_date_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  initial_deposit DECIMAL(10,2),
  deposit_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_payments table for commission tracking
CREATE TABLE public.referral_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_signups table to track who signed up via referrals
CREATE TABLE public.referral_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  signup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deposit_amount DECIMAL(10,2),
  deposit_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referrals" 
ON public.referrals 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for referral_payments table
CREATE POLICY "Users can view payments for their referrals" 
ON public.referral_payments 
FOR SELECT 
USING (referral_id IN (SELECT id FROM public.referrals WHERE user_id = auth.uid()));

-- Admin can insert payments (will need admin role check later)
CREATE POLICY "Allow payment inserts" 
ON public.referral_payments 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for referral_signups table
CREATE POLICY "Users can view signups for their referrals" 
ON public.referral_signups 
FOR SELECT 
USING (referral_id IN (SELECT id FROM public.referrals WHERE user_id = auth.uid()));

-- Admin can insert signups
CREATE POLICY "Allow signup tracking" 
ON public.referral_signups 
FOR INSERT 
WITH CHECK (true);

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code(first_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 1;
BEGIN
  -- Create base code from first name (first 3 chars + random number)
  base_code := UPPER(LEFT(first_name, 3)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  final_code := base_code;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.referrals WHERE referral_code = final_code) LOOP
    final_code := base_code || counter::TEXT;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to update referral statistics
CREATE OR REPLACE FUNCTION public.update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_referrals count
  UPDATE public.referrals 
  SET total_referrals = (
    SELECT COUNT(*) 
    FROM public.referral_signups 
    WHERE referral_id = NEW.referral_id
  )
  WHERE id = NEW.referral_id;
  
  -- Update total_earnings when deposit is recorded
  IF NEW.deposit_amount IS NOT NULL THEN
    UPDATE public.referrals 
    SET 
      total_earnings = total_earnings + (NEW.deposit_amount * 0.05),
      year_to_date_earnings = year_to_date_earnings + (NEW.deposit_amount * 0.05),
      status = 'deposited'
    WHERE id = NEW.referral_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for referral stats updates
CREATE TRIGGER update_referral_stats_trigger
  AFTER INSERT ON public.referral_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_stats();

-- Create function to update YTD earnings on payment
CREATE OR REPLACE FUNCTION public.update_payment_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to earning when first payment is made
  UPDATE public.referrals 
  SET status = 'earning'
  WHERE id = NEW.referral_id AND status = 'deposited';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment stats updates
CREATE TRIGGER update_payment_stats_trigger
  AFTER INSERT ON public.referral_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_stats();

-- Create updated_at trigger for referrals table
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();