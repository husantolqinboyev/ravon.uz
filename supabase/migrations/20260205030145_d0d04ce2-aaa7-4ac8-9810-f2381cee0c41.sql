-- TTS foydalanish jadvalini yaratish
CREATE TABLE public.tts_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS yoqish
ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;

-- Foydalanuvchilar o'z ma'lumotlarini ko'rishi mumkin
CREATE POLICY "Users can view own tts usage"
ON public.tts_usage
FOR SELECT
USING (true);

-- Faqat backend orqali insert qilish mumkin
CREATE POLICY "Service role can insert tts usage"
ON public.tts_usage
FOR INSERT
WITH CHECK (true);

-- Kunlik TTS limitini tekshirish funksiyasi
CREATE OR REPLACE FUNCTION public.get_daily_tts_count(_telegram_user_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.tts_usage
  WHERE telegram_user_id = _telegram_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
$$;

-- Premium foydalanuvchi ekanligini tekshirish
CREATE OR REPLACE FUNCTION public.is_premium_user(_telegram_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE telegram_user_id = _telegram_user_id
      AND is_active = true
      AND ends_at > now()
  )
$$;

-- Foydalanuvchi rolini tekshirish (text user_id uchun)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;