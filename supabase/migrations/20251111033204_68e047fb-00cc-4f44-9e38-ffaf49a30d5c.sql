-- Enable 2FA support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- Add crypto payment addresses
CREATE TABLE IF NOT EXISTS public.crypto_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID,
  currency TEXT NOT NULL DEFAULT 'USDT',
  network TEXT NOT NULL DEFAULT 'TRC20',
  address TEXT NOT NULL,
  qr_code TEXT,
  amount NUMERIC NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own crypto addresses"
ON public.crypto_addresses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crypto addresses"
ON public.crypto_addresses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add copy trading performance tracking
CREATE TABLE IF NOT EXISTS public.master_trader_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  total_profit NUMERIC DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  is_accepting_followers BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);

ALTER TABLE public.master_trader_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view master trader stats"
ON public.master_trader_stats
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own stats"
ON public.master_trader_stats
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add triggers
CREATE TRIGGER update_crypto_addresses_updated_at
BEFORE UPDATE ON public.crypto_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_trader_stats_updated_at
BEFORE UPDATE ON public.master_trader_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();