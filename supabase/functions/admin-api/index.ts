import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-user-id',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let statusCode = 200;
  let responseSummary = '';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get telegram user ID from header
    const telegramUserId = req.headers.get('x-telegram-user-id');
    
    if (!telegramUserId) {
      statusCode = 401;
      responseSummary = 'Telegram user ID required';
      return new Response(
        JSON.stringify({ error: responseSummary }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', telegramUserId)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.log(`User ${telegramUserId} is not admin`);
      statusCode = 403;
      responseSummary = 'Access denied. Admin only.';
      
      // Log the request
      await supabase.from('api_request_logs').insert({
        telegram_user_id: telegramUserId,
        endpoint: '/admin-api',
        method: req.method,
        status_code: statusCode,
        response_summary: responseSummary,
        duration_ms: Date.now() - startTime
      });

      return new Response(
        JSON.stringify({ error: responseSummary }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ============= SUBSCRIPTION PLANS =============
    
    if (action === 'get_plans') {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return new Response(JSON.stringify({ plans: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create_plan') {
      const { name, description, duration_days, price, daily_limit } = body;
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({ name, description, duration_days, price, daily_limit })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify({ plan: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_plan') {
      const { id, name, description, duration_days, price, daily_limit, is_active } = body;
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({ name, description, duration_days, price, daily_limit, is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify({ plan: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============= PAYMENT SETTINGS =============

    if (action === 'get_payment_settings') {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('is_active', true)
        .single();
      
      return new Response(JSON.stringify({ settings: data || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update_payment_settings') {
      const { card_number, card_holder, bank_name, additional_info } = body;
      
      // Deactivate all existing
      await supabase
        .from('payment_settings')
        .update({ is_active: false })
        .eq('is_active', true);
      
      // Insert new
      const { data, error } = await supabase
        .from('payment_settings')
        .insert({ card_number, card_holder, bank_name, additional_info, is_active: true })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify({ settings: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============= PAYMENT REQUESTS =============

    if (action === 'get_payment_requests') {
      const { status } = body;
      
      let query = supabase
        .from('payment_requests')
        .select(`
          *,
          plan:plan_id(name, price, duration_days)
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return new Response(JSON.stringify({ requests: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'approve_payment') {
      const { payment_id, admin_notes } = body;
      
      // Get payment request
      const { data: payment, error: paymentError } = await supabase
        .from('payment_requests')
        .select('*, plan:plan_id(*)')
        .eq('id', payment_id)
        .single();
      
      if (paymentError || !payment) {
        throw new Error('Payment request not found');
      }
      
      // Update payment status
      await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          admin_notes,
          processed_by: telegramUserId,
          processed_at: new Date().toISOString()
        })
        .eq('id', payment_id);
      
      // Create subscription
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + (payment.plan?.duration_days || 30));
      
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          telegram_user_id: payment.telegram_user_id,
          plan_id: payment.plan_id,
          ends_at: endsAt.toISOString(),
          created_by: telegramUserId
        })
        .select()
        .single();
      
      if (subError) throw subError;
      
      return new Response(JSON.stringify({ success: true, subscription }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'reject_payment') {
      const { payment_id, admin_notes } = body;
      
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'rejected',
          admin_notes,
          processed_by: telegramUserId,
          processed_at: new Date().toISOString()
        })
        .eq('id', payment_id);
      
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============= USER SUBSCRIPTIONS =============

    if (action === 'get_subscriptions') {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:plan_id(name, price, duration_days)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify({ subscriptions: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create_subscription') {
      const { telegram_user_id, plan_id, duration_days } = body;
      
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + duration_days);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          telegram_user_id,
          plan_id,
          ends_at: endsAt.toISOString(),
          created_by: telegramUserId
        })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify({ subscription: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'deactivate_subscription') {
      const { subscription_id } = body;
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('id', subscription_id);
      
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============= USER ROLES =============

    if (action === 'get_admins') {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');
      
      if (error) throw error;
      return new Response(JSON.stringify({ admins: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'add_admin') {
      const { user_id } = body;
      
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id, role: 'admin' })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify({ admin: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============= STATISTICS =============

    if (action === 'get_stats') {
      // Get total users (from auth_codes - unique telegram users)
      const { count: totalUsers } = await supabase
        .from('auth_codes')
        .select('telegram_user_id', { count: 'exact', head: true });
      
      // Get active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('ends_at', new Date().toISOString());
      
      // Get pending payments
      const { count: pendingPayments } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      // Get today's auth codes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayLogins } = await supabase
        .from('auth_codes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      return new Response(JSON.stringify({
        stats: {
          totalUsers: totalUsers || 0,
          activeSubscriptions: activeSubscriptions || 0,
          pendingPayments: pendingPayments || 0,
          todayLogins: todayLogins || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    statusCode = 400;
    responseSummary = 'Invalid action';
    return new Response(
      JSON.stringify({ error: responseSummary }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in admin-api:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
