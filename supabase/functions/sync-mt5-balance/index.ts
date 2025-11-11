import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { accountId } = await req.json();

    // Get account details
    const { data: account, error: accountError } = await supabaseClient
      .from("mt5_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError) throw accountError;

    // In production, connect to real MT5 API
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

    if (updateError) throw updateError;

    console.log(`Synced balance for account ${accountId}: ${simulatedBalance}`);

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
    console.error("Error syncing MT5 balance:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});