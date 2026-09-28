-- =========================================================================
-- لؤلؤة سنهور — تضييق صلاحيات Supabase (شغّل هذا في SQL Editor)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_secrets (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rate_buckets (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_buckets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_secrets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rate_buckets FORCE ROW LEVEL SECURITY;

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

REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.restaurant_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.restaurant_secrets FROM anon, authenticated;
REVOKE ALL ON TABLE public.rate_buckets FROM anon, authenticated;

GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.restaurant_settings TO service_role;
GRANT ALL ON TABLE public.restaurant_secrets TO service_role;
GRANT ALL ON TABLE public.rate_buckets TO service_role;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec jsonb;
  coupons jsonb;
  updated jsonb := '[]'::jsonb;
  item jsonb;
  code_upper text := upper(trim(p_code));
  used int;
  max_uses int;
  found boolean := false;
BEGIN
  IF code_upper = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;

  SELECT data INTO rec FROM public.restaurant_settings WHERE id = 'main' FOR UPDATE;
  IF rec IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing');
  END IF;

  coupons := COALESCE(rec->'coupons', '[]'::jsonb);
  FOR item IN SELECT * FROM jsonb_array_elements(coupons)
  LOOP
    IF upper(trim(COALESCE(item->>'code', ''))) = code_upper THEN
      found := true;
      used := COALESCE((item->>'usedCount')::int, 0);
      max_uses := COALESCE((item->>'maxUses')::int, 0);
      IF max_uses > 0 AND used >= max_uses THEN
        RETURN jsonb_build_object('ok', false, 'error', 'exhausted');
      END IF;
      item := jsonb_set(item, '{usedCount}', to_jsonb(used + 1));
    END IF;
    updated := updated || jsonb_build_array(item);
  END LOOP;

  IF NOT found THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  UPDATE public.restaurant_settings
  SET data = jsonb_set(rec, '{coupons}', updated),
      updated_at = timezone('utc', now())
  WHERE id = 'main';

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_max int, p_window_ms int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rate_buckets%ROWTYPE;
  now_ts timestamptz := timezone('utc', now());
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 OR p_max < 1 OR p_window_ms < 1000 THEN
    RETURN true;
  END IF;

  INSERT INTO public.rate_buckets(key, count, reset_at)
  VALUES (p_key, 1, now_ts + make_interval(secs => p_window_ms / 1000.0))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
      WHEN public.rate_buckets.reset_at <= now_ts THEN 1
      ELSE public.rate_buckets.count + 1
    END,
    reset_at = CASE
      WHEN public.rate_buckets.reset_at <= now_ts THEN now_ts + make_interval(secs => p_window_ms / 1000.0)
      ELSE public.rate_buckets.reset_at
    END
  RETURNING * INTO rec;

  RETURN rec.count > p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_coupon_usage(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, int, int) TO service_role;
