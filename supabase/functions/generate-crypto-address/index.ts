import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const generateAddressSchema = z.object({
  amount: z.number().positive().max(1000000, "Amount too large"),
  currency: z.enum(['USDT', 'BTC', 'ETH']).optional(),
  network: z.enum(['TRC20', 'ERC20', 'BTC']).optional(),
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
    const validationResult = generateAddressSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Input validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: "Invalid input parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL SECURITY WARNING: This feature generates FAKE crypto addresses
    // DO NOT use in production - integrate with real crypto payment provider
    console.warn('WARNING: Crypto payment feature is disabled - requires real provider integration');
    
    return new Response(
      JSON.stringify({ 
        error: "Crypto payments unavailable",
        message: "This feature requires integration with a real crypto payment provider (e.g., Coinbase Commerce, BTCPay Server). Please contact support."
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
