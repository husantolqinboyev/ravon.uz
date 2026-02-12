-- Create auth_codes table for bot-to-web authentication
CREATE TABLE public.auth_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  telegram_user_id BIGINT NOT NULL,
  telegram_first_name TEXT NOT NULL,
  telegram_last_name TEXT,
  telegram_username TEXT,
  telegram_photo_url TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_codes ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read/write (service role)
-- No public policies needed since this is handled by edge functions only

-- Create index for faster lookups
CREATE INDEX idx_auth_codes_code ON public.auth_codes(code);
CREATE INDEX idx_auth_codes_telegram_user_id ON public.auth_codes(telegram_user_id);
CREATE INDEX idx_auth_codes_expires_at ON public.auth_codes(expires_at);

-- Create function to clean up expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_codes WHERE expires_at < now();
END;
$$;