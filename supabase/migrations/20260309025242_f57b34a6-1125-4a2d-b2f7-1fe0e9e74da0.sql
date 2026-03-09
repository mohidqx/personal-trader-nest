
-- Update approve_transaction to send notifications
CREATE OR REPLACE FUNCTION public.approve_transaction(p_transaction_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction RECORD;
  v_new_balance NUMERIC;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already processed';
  END IF;

  IF v_transaction.type = 'deposit' THEN
    UPDATE wallets
    SET balance = balance + v_transaction.amount,
        updated_at = now()
    WHERE id = v_transaction.wallet_id;
  ELSIF v_transaction.type = 'withdrawal' THEN
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

  UPDATE transactions
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_transaction_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    v_transaction.user_id,
    CASE WHEN v_transaction.type = 'deposit' THEN 'Deposit Approved' ELSE 'Withdrawal Approved' END,
    CASE WHEN v_transaction.type = 'deposit'
      THEN 'Your deposit of $' || v_transaction.amount::text || ' has been approved and added to your wallet.'
      ELSE 'Your withdrawal of $' || v_transaction.amount::text || ' has been approved and is being processed.'
    END,
    'success'
  );

  RETURN TRUE;
END;
$function$;

-- New function: reject_transaction
CREATE OR REPLACE FUNCTION public.reject_transaction(p_transaction_id uuid, p_reason text DEFAULT 'No reason provided')
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already processed';
  END IF;

  UPDATE transactions
  SET status = 'rejected',
      notes = COALESCE(notes, '') || ' [Rejected: ' || p_reason || ']',
      updated_at = now()
  WHERE id = p_transaction_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    v_transaction.user_id,
    CASE WHEN v_transaction.type = 'deposit' THEN 'Deposit Rejected' ELSE 'Withdrawal Rejected' END,
    CASE WHEN v_transaction.type = 'deposit'
      THEN 'Your deposit of $' || v_transaction.amount::text || ' was rejected. Reason: ' || p_reason
      ELSE 'Your withdrawal of $' || v_transaction.amount::text || ' was rejected. Reason: ' || p_reason
    END,
    'warning'
  );

  RETURN TRUE;
END;
$function$;
