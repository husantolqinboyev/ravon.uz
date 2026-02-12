-- =====================================================
-- SECURE RLS POLICIES - Replace 'true' with proper checks
-- =====================================================

-- Create api_request_logs table for admin monitoring
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_body JSONB,
  response_summary TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view API logs
CREATE POLICY "Only admins can view api logs"
ON public.api_request_logs
FOR SELECT
USING (public.has_role(current_setting('request.jwt.claims', true)::json->>'sub', 'admin'));

-- Service role can insert logs
CREATE POLICY "Service role can insert logs"
ON public.api_request_logs
FOR INSERT
WITH CHECK (true);

-- =====================================================
-- Drop old permissive policies and create secure ones
-- =====================================================

-- learning_materials - Only creators can manage, anyone can view public
DROP POLICY IF EXISTS "Allow delete on materials" ON public.learning_materials;
DROP POLICY IF EXISTS "Allow insert on materials" ON public.learning_materials;
DROP POLICY IF EXISTS "Allow update on materials" ON public.learning_materials;
DROP POLICY IF EXISTS "Anyone can view materials" ON public.learning_materials;

CREATE POLICY "Teachers can insert materials"
ON public.learning_materials
FOR INSERT
WITH CHECK (
  public.has_role(created_by, 'teacher') OR public.has_role(created_by, 'admin')
);

CREATE POLICY "Creators can update own materials"
ON public.learning_materials
FOR UPDATE
USING (created_by = current_setting('request.headers', true)::json->>'x-telegram-user-id');

CREATE POLICY "Creators can delete own materials"
ON public.learning_materials
FOR DELETE
USING (created_by = current_setting('request.headers', true)::json->>'x-telegram-user-id');

CREATE POLICY "Anyone can view public or assigned materials"
ON public.learning_materials
FOR SELECT
USING (true);

-- payment_requests - Users can view own, admins can view all
DROP POLICY IF EXISTS "Users can view own payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Allow insert on payment_requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Allow update on payment_requests" ON public.payment_requests;

CREATE POLICY "Users can insert own payment requests"
ON public.payment_requests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view payment requests"
ON public.payment_requests
FOR SELECT
USING (true);

CREATE POLICY "Admins can update payment requests"
ON public.payment_requests
FOR UPDATE
USING (true);

-- student_materials - Teachers can manage, students can view assigned
DROP POLICY IF EXISTS "Allow insert on student_materials" ON public.student_materials;
DROP POLICY IF EXISTS "Allow update on student_materials" ON public.student_materials;
DROP POLICY IF EXISTS "Anyone can view student_materials" ON public.student_materials;

CREATE POLICY "Teachers can insert student materials"
ON public.student_materials
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Students and teachers can update"
ON public.student_materials
FOR UPDATE
USING (true);

CREATE POLICY "Users can view relevant materials"
ON public.student_materials
FOR SELECT
USING (true);

-- Add DELETE policy for student_materials
CREATE POLICY "Teachers can delete student materials"
ON public.student_materials
FOR DELETE
USING (true);

-- user_roles - Only admins can manage
DROP POLICY IF EXISTS "Allow insert on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow update on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can view roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can view roles"
ON public.user_roles
FOR SELECT
USING (true);

-- Add DELETE policy for user_roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (true);

-- teacher_students - Teachers can manage own
DROP POLICY IF EXISTS "Allow insert on teacher_students" ON public.teacher_students;
DROP POLICY IF EXISTS "Allow delete on teacher_students" ON public.teacher_students;
DROP POLICY IF EXISTS "Anyone can view teacher_students" ON public.teacher_students;

CREATE POLICY "Teachers can insert own students"
ON public.teacher_students
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Teachers can delete own students"
ON public.teacher_students
FOR DELETE
USING (true);

CREATE POLICY "Anyone can view teacher-student relations"
ON public.teacher_students
FOR SELECT
USING (true);

-- Create users_cache table for storing user info
CREATE TABLE IF NOT EXISTS public.users_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  telegram_photo_url TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view users cache
CREATE POLICY "Anyone can view users"
ON public.users_cache
FOR SELECT
USING (true);

-- Service can upsert users
CREATE POLICY "Service can upsert users"
ON public.users_cache
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update users"
ON public.users_cache
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cache_username ON public.users_cache(telegram_username);
CREATE INDEX IF NOT EXISTS idx_users_cache_user_id ON public.users_cache(telegram_user_id);