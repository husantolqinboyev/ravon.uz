-- Create table to track pronunciation test usage
CREATE TABLE IF NOT EXISTS public.pronunciation_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pronunciation_usage ENABLE ROW LEVEL SECURITY;

-- Allow insert from edge functions
CREATE POLICY "Allow insert from service role" 
ON public.pronunciation_usage 
FOR INSERT 
WITH CHECK (true);

-- Allow select for service role
CREATE POLICY "Allow select from service role" 
ON public.pronunciation_usage 
FOR SELECT 
USING (true);

-- Create function to get daily pronunciation test count
-- Resets at 12:00 Tashkent time (UTC+5) = 07:00 UTC
CREATE OR REPLACE FUNCTION public.get_daily_pronunciation_count(_telegram_user_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.pronunciation_usage
  WHERE telegram_user_id = _telegram_user_id
    AND created_at >= (
      CASE 
        WHEN (now() AT TIME ZONE 'Asia/Tashkent')::time >= '12:00:00'::time 
        THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') + INTERVAL '12 hours') AT TIME ZONE 'Asia/Tashkent'
        ELSE (date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') - INTERVAL '12 hours') AT TIME ZONE 'Asia/Tashkent'
      END
    )
$$;

-- Update TTS count function to use Tashkent 12:00 reset time
CREATE OR REPLACE FUNCTION public.get_daily_tts_count(_telegram_user_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.tts_usage
  WHERE telegram_user_id = _telegram_user_id
    AND created_at >= (
      CASE 
        WHEN (now() AT TIME ZONE 'Asia/Tashkent')::time >= '12:00:00'::time 
        THEN (date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') + INTERVAL '12 hours') AT TIME ZONE 'Asia/Tashkent'
        ELSE (date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') - INTERVAL '12 hours') AT TIME ZONE 'Asia/Tashkent'
      END
    )
$$;