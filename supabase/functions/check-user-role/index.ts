 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const { telegramUserId } = await req.json();
 
     if (!telegramUserId) {
       return new Response(JSON.stringify({ error: 'User ID required', role: null }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Initialize Supabase client with service role
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Get user role from database
     const { data: role } = await supabase.rpc('get_user_role', {
       _user_id: telegramUserId.toString()
     });
 
     console.log(`Role check: user=${telegramUserId}, role=${role}`);
 
     return new Response(JSON.stringify({ 
       role: role || 'user',
       telegramUserId: telegramUserId.toString()
     }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error) {
     console.error('Role check error:', error);
     return new Response(JSON.stringify({ error: 'Server error', role: null }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });