-- Teacher role enum qo'shish
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- O'qituvchi-o'quvchi bog'lanish jadvali
CREATE TABLE public.teacher_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

-- O'quv materiallari jadvali
CREATE TABLE public.learning_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('word', 'text')),
  content TEXT NOT NULL,
  translation TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- O'quvchilarga yuborilgan materiallar
CREATE TABLE public.student_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.learning_materials(id) ON DELETE CASCADE NOT NULL,
  student_id TEXT NOT NULL,
  sent_by TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(material_id, student_id)
);

-- Test natijalari jadvali
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  material_id UUID REFERENCES public.learning_materials(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  transcript TEXT,
  accuracy_score NUMERIC,
  fluency_score NUMERIC,
  completeness_score NUMERIC,
  prosody_score NUMERIC,
  overall_score NUMERIC,
  ai_feedback TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS yoqish
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- teacher_students policies
CREATE POLICY "Anyone can view teacher_students" 
ON public.teacher_students FOR SELECT USING (true);

CREATE POLICY "Allow insert on teacher_students" 
ON public.teacher_students FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete on teacher_students" 
ON public.teacher_students FOR DELETE USING (true);

-- learning_materials policies
CREATE POLICY "Anyone can view materials" 
ON public.learning_materials FOR SELECT USING (true);

CREATE POLICY "Allow insert on materials" 
ON public.learning_materials FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on materials" 
ON public.learning_materials FOR UPDATE USING (true);

CREATE POLICY "Allow delete on materials" 
ON public.learning_materials FOR DELETE USING (true);

-- student_materials policies
CREATE POLICY "Anyone can view student_materials" 
ON public.student_materials FOR SELECT USING (true);

CREATE POLICY "Allow insert on student_materials" 
ON public.student_materials FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on student_materials" 
ON public.student_materials FOR UPDATE USING (true);

-- test_results policies
CREATE POLICY "Anyone can view test_results" 
ON public.test_results FOR SELECT USING (true);

CREATE POLICY "Allow insert on test_results" 
ON public.test_results FOR INSERT WITH CHECK (true);

-- has_role funksiyasini yangilash (teacher uchun)
CREATE OR REPLACE FUNCTION public.has_role(_user_id text, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;