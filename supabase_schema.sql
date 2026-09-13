-- =========================================================================
-- لؤلؤة سنهور - كشري وطواجن | Supabase PostgreSQL Schema
-- =========================================================================

-- 1. جدول الطلبات (Orders Table)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'delivery',
    delivery_zone TEXT,
    delivery_address TEXT,
    building_notes TEXT,
    special_notes TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    items_count INTEGER NOT NULL DEFAULT 1,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    coupon_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, on_the_way, completed, cancelled
    payment_proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تمكين أمان الصفوف (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- لا توجد سياسات عامة: القراءة والكتابة تتم من السيرفر بمفتاح service role فقط.
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;

-- 2. تفعيل الإشعارات اللحظية للطلبات (Realtime Subscriptions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- تم إعداد المخطط بنجاح لمطعم لؤلؤة سنهور!
