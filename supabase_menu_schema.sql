-- =========================================================================
-- جدول إعدادات ومنيو مطعم لؤلؤة سنهور (Shared Restaurant Settings & Menu)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تمكين أمان الصفوف (Row Level Security)
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- لا توجد سياسات عامة على الإعدادات: القراءة العامة تتم عبر /api/menu من السيرفر.
DROP POLICY IF EXISTS "Allow public read restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Allow public insert restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Allow public update restaurant_settings" ON public.restaurant_settings;

CREATE TABLE IF NOT EXISTS public.restaurant_secrets (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.restaurant_secrets ENABLE ROW LEVEL SECURITY;

-- 3. تفعيل التحديث اللحظي (Realtime) لجدول الإعدادات والمنيو
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'restaurant_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_settings;
  END IF;
END $$;
