-- Fix critical security issues for copy trading platform

-- 1. Fix wallets table: Add UPDATE policy to prevent unauthorized balance changes
-- Only allow system to update wallet balances (not users directly)
CREATE POLICY "Only system can update wallet balances"
ON public.wallets
FOR UPDATE
TO authenticated
USING (false); -- No one can update directly

-- 2. Fix transactions table: Add DELETE policy to prevent deletion of financial records
CREATE POLICY "Prevent transaction deletion"
ON public.transactions
FOR DELETE
TO authenticated
USING (false); -- No one can delete transactions

-- 3. Add a secure function to update wallet balance (only through transactions)
CREATE OR REPLACE FUNCTION public.process_transaction(
  p_user_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_payment_method TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- Verify user owns the wallet
  IF NOT EXISTS (
    SELECT 1 FROM wallets 
    WHERE id = p_wallet_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized wallet access';
  END IF;

  -- Create transaction record
  INSERT INTO transactions (
    user_id,
    wallet_id,
    amount,
    type,
    payment_method,
    notes,
    status
  )
  VALUES (
    p_user_id,
    p_wallet_id,
    p_amount,
    p_type,
    p_payment_method,
    p_notes,
    'pending'
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- 4. Add function for admins to approve transactions and update wallet balance
CREATE OR REPLACE FUNCTION public.approve_transaction(
  p_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_new_balance NUMERIC;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get transaction details
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already processed';
  END IF;

  -- Update wallet balance based on transaction type
  IF v_transaction.type = 'deposit' THEN
    UPDATE wallets
    SET balance = balance + v_transaction.amount,
        updated_at = now()
    WHERE id = v_transaction.wallet_id;
  ELSIF v_transaction.type = 'withdrawal' THEN
    -- Check sufficient balance
    SELECT balance INTO v_new_balance
    FROM wallets
    WHERE id = v_transaction.wallet_id;
    
    IF v_new_balance < v_transaction.amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE wallets
    SET balance = balance - v_transaction.amount,
        updated_at = now()
    WHERE id = v_transaction.wallet_id;
  END IF;

  -- Mark transaction as completed
  UPDATE transactions
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN TRUE;
END;
$$;