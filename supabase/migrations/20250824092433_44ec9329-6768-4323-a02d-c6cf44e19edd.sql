-- Create audit trail table for tracking all request changes
CREATE TABLE public.request_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  admin_id UUID,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fee structure table
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('deposit', 'withdrawal')),
  payment_method TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  fee_type TEXT NOT NULL CHECK (fee_type IN ('fixed', 'percentage', 'tiered')),
  fee_value NUMERIC(10,4) NOT NULL,
  minimum_fee NUMERIC(10,4) DEFAULT 0,
  maximum_fee NUMERIC(10,4),
  tier_thresholds JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add fee-related columns to requests table
ALTER TABLE public.requests ADD COLUMN calculated_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.requests ADD COLUMN net_amount NUMERIC(15,2);
ALTER TABLE public.requests ADD COLUMN fee_breakdown JSONB;

-- Enable Row Level Security for new tables
ALTER TABLE public.request_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log
CREATE POLICY "Users can view their own audit logs" 
ON public.request_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policies for fee structures (read-only for users)
CREATE POLICY "Users can view fee structures" 
ON public.fee_structures 
FOR SELECT 
USING (is_active = true);

-- Insert default fee structures
INSERT INTO public.fee_structures (request_type, payment_method, currency, fee_type, fee_value, minimum_fee, maximum_fee) VALUES
-- Deposit fees
('deposit', 'Bank Transfer', 'USD', 'fixed', 0.00, 0, NULL),
('deposit', 'Credit Card', 'USD', 'percentage', 2.90, 0.30, NULL),
('deposit', 'Debit Card', 'USD', 'percentage', 1.50, 0.30, NULL),
('deposit', 'Wire Transfer', 'USD', 'fixed', 25.00, 25, NULL),
('deposit', 'PayPal', 'USD', 'percentage', 2.90, 0.30, NULL),
('deposit', 'Cryptocurrency (Bitcoin)', 'USD', 'percentage', 1.00, 1.00, NULL),
('deposit', 'Cryptocurrency (Ethereum)', 'USD', 'percentage', 1.50, 2.00, NULL),
('deposit', 'ACH Transfer', 'USD', 'fixed', 1.00, 1, NULL),

-- Withdrawal fees
('withdrawal', 'Bank Transfer', 'USD', 'fixed', 5.00, 5, NULL),
('withdrawal', 'Wire Transfer', 'USD', 'fixed', 35.00, 35, NULL),
('withdrawal', 'PayPal', 'USD', 'percentage', 2.00, 1.00, 25.00),
('withdrawal', 'Cryptocurrency (Bitcoin)', 'USD', 'fixed', 10.00, 10, NULL),
('withdrawal', 'Cryptocurrency (Ethereum)', 'USD', 'fixed', 15.00, 15, NULL),
('withdrawal', 'Check', 'USD', 'fixed', 15.00, 15, NULL),
('withdrawal', 'ACH Transfer', 'USD', 'fixed', 3.00, 3, NULL);

-- Create function to calculate fees
CREATE OR REPLACE FUNCTION public.calculate_request_fee(
  p_request_type TEXT,
  p_payment_method TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS TABLE (
  fee_amount NUMERIC,
  net_amount NUMERIC,
  fee_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fee_structure RECORD;
  calculated_fee NUMERIC := 0;
  breakdown JSONB := '{}';
BEGIN
  -- Get the fee structure for this request
  SELECT * INTO fee_structure
  FROM public.fee_structures
  WHERE request_type = p_request_type
    AND payment_method = p_payment_method
    AND currency = p_currency
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    -- Default to no fee if no structure found
    RETURN QUERY SELECT 0::NUMERIC, p_amount, '{"type": "none", "reason": "No fee structure found"}'::JSONB;
    RETURN;
  END IF;

  -- Calculate fee based on type
  IF fee_structure.fee_type = 'fixed' THEN
    calculated_fee := fee_structure.fee_value;
    breakdown := jsonb_build_object(
      'type', 'fixed',
      'base_fee', fee_structure.fee_value,
      'calculation', 'Fixed fee'
    );
  ELSIF fee_structure.fee_type = 'percentage' THEN
    calculated_fee := (p_amount * fee_structure.fee_value / 100);
    breakdown := jsonb_build_object(
      'type', 'percentage',
      'rate', fee_structure.fee_value,
      'base_amount', p_amount,
      'calculation', CONCAT(fee_structure.fee_value, '% of ', p_amount)
    );
  END IF;

  -- Apply minimum fee
  IF fee_structure.minimum_fee IS NOT NULL AND calculated_fee < fee_structure.minimum_fee THEN
    calculated_fee := fee_structure.minimum_fee;
    breakdown := breakdown || jsonb_build_object('minimum_applied', fee_structure.minimum_fee);
  END IF;

  -- Apply maximum fee
  IF fee_structure.maximum_fee IS NOT NULL AND calculated_fee > fee_structure.maximum_fee THEN
    calculated_fee := fee_structure.maximum_fee;
    breakdown := breakdown || jsonb_build_object('maximum_applied', fee_structure.maximum_fee);
  END IF;

  -- Calculate net amount
  RETURN QUERY SELECT 
    calculated_fee,
    CASE 
      WHEN p_request_type = 'withdrawal' THEN p_amount - calculated_fee
      ELSE p_amount
    END,
    breakdown;
END;
$$;

-- Create function to log request changes
CREATE OR REPLACE FUNCTION public.log_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.request_audit_log (
    request_id,
    user_id,
    action,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for audit logging
CREATE TRIGGER request_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_change();

-- Create indexes for better performance
CREATE INDEX idx_request_audit_log_request_id ON public.request_audit_log(request_id);
CREATE INDEX idx_request_audit_log_user_id ON public.request_audit_log(user_id);
CREATE INDEX idx_request_audit_log_created_at ON public.request_audit_log(created_at);
CREATE INDEX idx_fee_structures_lookup ON public.fee_structures(request_type, payment_method, currency, is_active);

-- Add trigger for fee structure timestamps
CREATE TRIGGER update_fee_structures_updated_at
BEFORE UPDATE ON public.fee_structures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();