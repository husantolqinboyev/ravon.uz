import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { action } = body;

    // Action: generate - Bot calls this to generate a code for a user
    if (action === 'generate') {
      const { telegram_user_id, telegram_first_name, telegram_last_name, telegram_username, telegram_photo_url } = body;

      if (!telegram_user_id || !telegram_first_name) {
        return new Response(
          JSON.stringify({ error: 'telegram_user_id and telegram_first_name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Generating auth code for Telegram user: ${telegram_user_id}`);

      // Delete any existing codes for this user
      await supabase
        .from('auth_codes')
        .delete()
        .eq('telegram_user_id', telegram_user_id);

      // Generate new code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Insert new code
      const { error } = await supabase
        .from('auth_codes')
        .insert({
          code,
          telegram_user_id,
          telegram_first_name,
          telegram_last_name,
          telegram_username,
          telegram_photo_url,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Error inserting auth code:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to generate code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Auth code generated successfully: ${code}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          code,
          expires_at: expiresAt.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: verify - Web app calls this to verify a code
    if (action === 'verify') {
      const { code } = body;

      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Code is required', valid: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Verifying auth code: ${code}`);

      // Clean up expired codes first
      await supabase.rpc('cleanup_expired_auth_codes');

      // Find the code
      const { data: authCode, error } = await supabase
        .from('auth_codes')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !authCode) {
        console.log('Code not found or expired:', error?.message);
        return new Response(
          JSON.stringify({ 
            error: 'Kod topilmadi yoki muddati tugagan. Iltimos, botdan yangi kod oling.',
            valid: false 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark code as used
      await supabase
        .from('auth_codes')
        .update({ used: true })
        .eq('id', authCode.id);

      // Update users_cache for future lookups
      await supabase
        .from('users_cache')
        .upsert({
          telegram_user_id: authCode.telegram_user_id.toString(),
          telegram_username: authCode.telegram_username,
          telegram_first_name: authCode.telegram_first_name,
          telegram_last_name: authCode.telegram_last_name,
          telegram_photo_url: authCode.telegram_photo_url,
          last_seen_at: new Date().toISOString()
        }, { onConflict: 'telegram_user_id' });

      console.log(`Auth code verified successfully for user: ${authCode.telegram_user_id}`);

      return new Response(
        JSON.stringify({
          valid: true,
          user: {
            telegramUserId: authCode.telegram_user_id,
            firstName: authCode.telegram_first_name,
            lastName: authCode.telegram_last_name,
            username: authCode.telegram_username,
            photoUrl: authCode.telegram_photo_url,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "generate" or "verify"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in telegram-auth:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
