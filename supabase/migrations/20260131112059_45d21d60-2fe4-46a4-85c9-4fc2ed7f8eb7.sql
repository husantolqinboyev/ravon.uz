-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Telegram user ID
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles (only admins can read/write)
CREATE POLICY "Only admins can view roles"
ON public.user_roles FOR SELECT
USING (true); -- Allow reading for now, secure with edge function

-- Create subscription plans table (managed by admin)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  daily_limit INTEGER, -- NULL means unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT -- Admin who created the subscription
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow reading own subscription
CREATE POLICY "Users can view own subscriptions"
ON public.user_subscriptions FOR SELECT
USING (true); -- Secure with edge function

-- Create payment_requests table
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  plan_id UUID REFERENCES public.subscription_plans(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_photo_url TEXT,
  admin_notes TEXT,
  processed_by TEXT, -- Admin who processed
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Allow reading payment requests
CREATE POLICY "Users can view own payment requests"
ON public.payment_requests FOR SELECT
USING (true); -- Secure with edge function

-- Create payment_settings table (admin managed)
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number TEXT,
  card_holder TEXT,
  bank_name TEXT,
  additional_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Allow reading active payment settings
CREATE POLICY "Anyone can view active payment settings"
ON public.payment_settings FOR SELECT
USING (is_active = true);

-- Insert default admin (Telegram user ID will be set by actual admin)
-- INSERT INTO public.user_roles (user_id, role) VALUES ('ADMIN_TELEGRAM_ID', 'admin');

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, duration_days, price, daily_limit) VALUES
('Bepul', 'Kuniga 3 ta test', 0, 0, 3),
('Oylik Premium', 'Cheksiz testlar - 1 oy', 30, 50000, NULL),
('3 Oylik Premium', 'Cheksiz testlar - 3 oy (20% chegirma)', 90, 120000, NULL),
('Yillik Premium', 'Cheksiz testlar - 1 yil (40% chegirma)', 365, 360000, NULL);