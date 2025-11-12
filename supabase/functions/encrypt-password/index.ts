import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { password, accountId, action } = await req.json();

    if (action === 'encrypt') {
      // Use Web Crypto API for proper encryption
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      // Generate a random key for this password
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      // Export key
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      
      // Combine IV, key, and encrypted data
      const combined = new Uint8Array(12 + exportedKey.byteLength + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(exportedKey), 12);
      combined.set(new Uint8Array(encrypted), 12 + exportedKey.byteLength);
      
      // Convert to base64 for storage
      const encryptedPassword = btoa(String.fromCharCode(...combined));
      
      return new Response(
        JSON.stringify({ encryptedPassword }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'decrypt') {
      // Decrypt password
      const combined = Uint8Array.from(atob(password), c => c.charCodeAt(0));
      
      const iv = combined.slice(0, 12);
      const keyData = combined.slice(12, 12 + 32);
      const encryptedData = combined.slice(12 + 32);
      
      // Import key
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );
      
      const decoder = new TextDecoder();
      const decryptedPassword = decoder.decode(decrypted);
      
      return new Response(
        JSON.stringify({ password: decryptedPassword }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Encryption error:', error);
    return new Response(
      JSON.stringify({ error: 'Encryption operation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
