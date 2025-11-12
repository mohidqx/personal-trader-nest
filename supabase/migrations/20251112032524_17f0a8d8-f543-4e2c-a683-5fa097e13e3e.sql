-- Add UPDATE and DELETE policies to crypto_addresses to prevent unauthorized modifications
CREATE POLICY "Prevent crypto address updates" 
ON crypto_addresses 
FOR UPDATE 
USING (false);

CREATE POLICY "Prevent crypto address deletions" 
ON crypto_addresses 
FOR DELETE 
USING (false);

-- Add CTrader API columns to mt5_accounts (reuse table for multi-platform support)
ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS platform text DEFAULT 'MT5';
ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS ctrader_client_id text;
ALTER TABLE mt5_accounts ADD COLUMN IF NOT EXISTS ctrader_client_secret text;

-- Add Google OAuth provider columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_id text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oauth_provider text;

-- Update mt5_accounts to be more generic (supports both MT5 and CTrader)
COMMENT ON COLUMN mt5_accounts.platform IS 'Trading platform: MT5 or CTrader';
COMMENT ON COLUMN mt5_accounts.ctrader_client_id IS 'CTrader OAuth client ID (encrypted)';
COMMENT ON COLUMN mt5_accounts.ctrader_client_secret IS 'CTrader OAuth client secret (encrypted)';
