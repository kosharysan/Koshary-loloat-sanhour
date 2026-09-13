-- =========================================================================
-- لؤلؤة سنهور — تضييق صلاحيات Supabase (شغّل هذا في SQL Editor)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_secrets (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.restaurant_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read restaurant_secrets" ON public.restaurant_secrets;
DROP POLICY IF EXISTS "Allow public insert restaurant_secrets" ON public.restaurant_secrets;
DROP POLICY IF EXISTS "Allow public update restaurant_secrets" ON public.restaurant_secrets;
DROP POLICY IF EXISTS "Allow public delete restaurant_secrets" ON public.restaurant_secrets;

DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;

DROP POLICY IF EXISTS "Allow public read restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Allow public insert restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Allow public update restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Allow public delete restaurant_settings" ON public.restaurant_settings;
