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

    const { amount, currency = "USDT", network = "TRC20" } = await req.json();

    // Generate a unique crypto address (in production, use real crypto API)
    const address = `T${Math.random().toString(36).substring(2, 15).toUpperCase()}${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    
    // Generate QR code URL
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${address}`;
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { data: cryptoAddress, error } = await supabaseClient
      .from("crypto_addresses")
      .insert({
        user_id: user.id,
        currency,
        network,
        address,
        qr_code: qrCode,
        amount,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    console.log("Generated crypto address:", address);

    return new Response(
      JSON.stringify({ 
        address, 
        qrCode, 
        expiresAt,
        currency,
        network,
        amount 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating crypto address:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});