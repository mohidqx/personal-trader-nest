-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create trades table for real-time monitoring
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_account_id UUID REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  volume NUMERIC NOT NULL,
  open_price NUMERIC NOT NULL,
  close_price NUMERIC,
  profit NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Policies for trades
CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades"
  ON public.trades FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Add trigger for trades updated_at
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add profile picture and additional fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add MT5 API credentials
ALTER TABLE public.mt5_accounts
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update their own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to copy trades automatically
CREATE OR REPLACE FUNCTION public.copy_trade_to_followers(
  p_master_user_id UUID,
  p_trade_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade RECORD;
  v_follower RECORD;
  v_adjusted_volume NUMERIC;
BEGIN
  -- Get the master trade
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  
  -- Loop through all active followers
  FOR v_follower IN 
    SELECT cr.*, mt5.id as follower_mt5_account_id
    FROM copy_relationships cr
    JOIN mt5_accounts mt5 ON mt5.user_id = cr.follower_user_id
    WHERE cr.master_account_id IN (
      SELECT id FROM mt5_accounts WHERE user_id = p_master_user_id
    )
    AND cr.is_active = true
  LOOP
    -- Calculate adjusted volume based on risk percentage
    v_adjusted_volume := v_trade.volume * (v_follower.risk_percentage / 100);
    
    -- Create copied trade
    INSERT INTO trades (
      user_id,
      mt5_account_id,
      symbol,
      type,
      volume,
      open_price,
      status,
      opened_at
    ) VALUES (
      v_follower.follower_user_id,
      v_follower.follower_mt5_account_id,
      v_trade.symbol,
      v_trade.type,
      v_adjusted_volume,
      v_trade.open_price,
      'open',
      v_trade.opened_at
    );
    
    -- Create notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      v_follower.follower_user_id,
      'Trade Copied',
      'A new trade has been copied: ' || v_trade.symbol || ' ' || v_trade.type,
      'trade'
    );
  END LOOP;
END;
$$;