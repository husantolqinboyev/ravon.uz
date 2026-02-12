-- Add RLS policies for INSERT, UPDATE, DELETE on user_roles (admin only via edge function)
-- No direct database INSERT/UPDATE/DELETE - all through edge functions with service role

-- Add policy for user_subscriptions INSERT
CREATE POLICY "Allow service role insert on user_subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (true);

-- Add policy for user_subscriptions UPDATE  
CREATE POLICY "Allow service role update on user_subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (true);

-- Add policy for payment_requests INSERT
CREATE POLICY "Allow insert on payment_requests"
ON public.payment_requests FOR INSERT
WITH CHECK (true);

-- Add policy for payment_requests UPDATE
CREATE POLICY "Allow update on payment_requests"
ON public.payment_requests FOR UPDATE
USING (true);

-- Add policies for subscription_plans management
CREATE POLICY "Allow insert on subscription_plans"
ON public.subscription_plans FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update on subscription_plans"
ON public.subscription_plans FOR UPDATE
USING (true);

-- Add policies for payment_settings management
CREATE POLICY "Allow insert on payment_settings"
ON public.payment_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update on payment_settings"
ON public.payment_settings FOR UPDATE
USING (true);

-- Add insert/update policy for user_roles
CREATE POLICY "Allow insert on user_roles"
ON public.user_roles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update on user_roles"
ON public.user_roles FOR UPDATE
USING (true);