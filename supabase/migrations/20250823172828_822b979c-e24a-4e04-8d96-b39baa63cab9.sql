-- Fix security warnings by setting search_path for functions

-- Update generate_referral_code function with security definer and search_path
CREATE OR REPLACE FUNCTION public.generate_referral_code(first_name TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update update_referral_stats function with security definer and search_path
CREATE OR REPLACE FUNCTION public.update_referral_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update update_payment_stats function with security definer and search_path
CREATE OR REPLACE FUNCTION public.update_payment_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update status to earning when first payment is made
  UPDATE public.referrals 
  SET status = 'earning'
  WHERE id = NEW.referral_id AND status = 'deposited';
  
  RETURN NEW;
END;
$$;