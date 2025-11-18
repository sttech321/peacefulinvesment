-- Create MetaTrader accounts table
CREATE TABLE public.metatrader_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login TEXT NOT NULL,
  server TEXT NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  equity DECIMAL(15,2) NOT NULL DEFAULT 0,
  margin DECIMAL(15,2) NOT NULL DEFAULT 0,
  free_margin DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  account_type TEXT NOT NULL DEFAULT 'demo' CHECK (account_type IN ('demo', 'live')),
  leverage INTEGER NOT NULL DEFAULT 100,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.metatrader_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own MetaTrader accounts" 
ON public.metatrader_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own MetaTrader accounts" 
ON public.metatrader_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MetaTrader accounts" 
ON public.metatrader_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MetaTrader accounts" 
ON public.metatrader_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_metatrader_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_metatrader_accounts_updated_at
  BEFORE UPDATE ON public.metatrader_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_metatrader_accounts_updated_at();

-- Insert sample data for testing
INSERT INTO public.metatrader_accounts (user_id, login, server, balance, equity, margin, free_margin, currency, status, account_type, leverage) VALUES
-- Note: This will only work if there are actual users in the auth.users table
-- You can remove this section if you want to avoid sample data
(
  (SELECT id FROM auth.users LIMIT 1),
  'MT5001234',
  'MetaQuotes-Demo',
  10000.00,
  10150.50,
  200.00,
  9950.50,
  'USD',
  'active',
  'demo',
  500
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'MT5005678',
  'IC Markets-Live',
  5000.00,
  4850.25,
  150.00,
  4700.25,
  'EUR',
  'active',
  'live',
  200
)
ON CONFLICT DO NOTHING;