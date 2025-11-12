import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const syncBalanceSchema = z.object({
  accountId: z.string().uuid("Invalid account ID format"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    
    // Validate input
    const validationResult = syncBalanceSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Input validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: "Invalid account ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { accountId } = validationResult.data;

    // Verify account ownership
    const { data: account, error: accountError } = await supabaseClient
      .from("mt5_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      console.error('Account not found or unauthorized');
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production, connect to real MT5/CTrader API
    // For now, simulate balance sync
    const simulatedBalance = parseFloat((Math.random() * 10000 + 5000).toFixed(2));
    const simulatedEquity = parseFloat((Math.random() * 10000 + 5000).toFixed(2));

    const { error: updateError } = await supabaseClient
      .from("mt5_accounts")
      .update({
        balance: simulatedBalance,
        equity: simulatedEquity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Synced balance for account ${accountId}`);

    return new Response(
      JSON.stringify({ 
        balance: simulatedBalance, 
        equity: simulatedEquity,
        message: "Balance synced successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
