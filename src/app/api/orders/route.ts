import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, requireSession } from '@/lib/auth';
import { priceIncomingOrder, type IncomingCartLine } from '@/lib/orderPricing';
import { adminGetSettings, adminSaveSettings, getServiceSupabase } from '@/lib/supabaseAdmin';

const MAX_ORDERS_PER_IP = 8;
const MAX_ORDERS_PER_PHONE = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const orderAttempts = new Map<string, { count: number; resetAt: number }>();

function hitRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const current = orderAttempts.get(key);
  if (!current || current.resetAt <= now) {
    orderAttempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (current.count >= max) return true;
  current.count += 1;
  return false;
}

function normalizePhone(input: string): string {
  return String(input || '').replace(/[^\d]/g, '');
}

function isValidCustomerPhone(phone: string): boolean {
  if (phone.length === 11 && phone.startsWith('01')) return true;
  if (phone.length === 12 && phone.startsWith('201')) return true;
  if (phone.length === 13 && phone.startsWith('2001')) return true;
  return false;
}

async function incrementCouponUsage(code: string | null) {
  if (!code) return;
  const settings = await adminGetSettings();
  if (!settings || !Array.isArray(settings.coupons)) return;
  const coupons = settings.coupons.map((c: any) => {
    if (String(c.code || '').toUpperCase() === code) {
      return { ...c, usedCount: (c.usedCount || 0) + 1 };
    }
    return c;
  });
  await adminSaveSettings({ ...settings, coupons });
}

export async function GET(req: NextRequest) {
  const session = requireSession(req, ['admin', 'monitor']);
  if (session instanceof NextResponse) return session;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
  }

  const scope = req.nextUrl.searchParams.get('scope') === 'current' ? 'current' : 'all';
  const settings = (await adminGetSettings()) || {};
  const cloudOverrides: Record<string, string> = settings.orderStatusOverrides || {};
  const cloudDeleted: string[] = settings.deletedOrderIds || [];
  const archivedSet = new Set((settings.archivedOrderIds || []).map(String));
  const deletedSet = new Set(cloudDeleted);

  let data: any[] | null = null;
  try {
    const result = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }
    data = result.data;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'تعذر الاتصال بقاعدة البيانات' },
      { status: 500 }
    );
  }

  const merged = (data || [])
    .filter((order: any) => !deletedSet.has(order.id))
    .filter((order: any) => (scope === 'current' ? !archivedSet.has(String(order.id)) : true))
    .map((order: any) => {
      const override = cloudOverrides[order.id];
      return override ? { ...order, status: override } : order;
    });

  return NextResponse.json({ success: true, data: merged });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (hitRateLimit(`ip:${ip}`, MAX_ORDERS_PER_IP)) {
      return NextResponse.json(
        { success: false, error: 'طلبت أكثر من مرة في وقت قصير. انتظر ربع ساعة ثم أعد المحاولة.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    }

    const customerName = String(body.customer_name || '').trim().slice(0, 80);
    const customerPhone = normalizePhone(body.customer_phone);
    if (customerName.length < 2) {
      return NextResponse.json({ success: false, error: 'اكتب الاسم الكريم عشان نقدر نسجّل الطلب.' }, { status: 400 });
    }
    if (!isValidCustomerPhone(customerPhone)) {
      return NextResponse.json(
        { success: false, error: 'اكتب رقم موبايل مصري صحيح مثل 010xxxxxxxx' },
        { status: 400 }
      );
    }
    if (hitRateLimit(`phone:${customerPhone}`, MAX_ORDERS_PER_PHONE)) {
      return NextResponse.json(
        { success: false, error: 'نفس الرقم ده طلب أكثر من مرة في وقت قصير. انتظر ربع ساعة ثم أعد المحاولة.' },
        { status: 429 }
      );
    }

    const orderType = body.order_type === 'pickup' ? 'pickup' : 'delivery';
    const paymentMethod = ['cash', 'vodafone_cash', 'instapay'].includes(body.payment_method)
      ? body.payment_method
      : 'cash';

    const settings = (await adminGetSettings()) || {};
    const priced = priceIncomingOrder(settings, {
      items: Array.isArray(body.items) ? (body.items as IncomingCartLine[]) : [],
      orderType,
      selectedZoneId: String(body.selected_zone_id || ''),
      deliveryZoneName: String(body.delivery_zone || ''),
      couponCode: body.coupon_code || null,
      paymentMethod,
    });

    if (!priced.ok) {
      return NextResponse.json({ success: false, error: priced.error }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'السيرفر مش جاهز لتسجيل الطلب دلوقتي. حاول بعد دقيقة أو كلم المطعم على واتساب.' },
        { status: 503 }
      );
    }

    const order = {
      customer_name: customerName,
      customer_phone: String(body.customer_phone || '').trim().slice(0, 20),
      order_type: orderType,
      delivery_zone: priced.priced.deliveryZoneName.slice(0, 200),
      delivery_address: orderType === 'delivery' ? String(body.delivery_address || '').slice(0, 500) : '',
      building_notes: String(body.building_notes || '').slice(0, 300),
      special_notes: String(body.special_notes || '').slice(0, 4000),
      payment_method: paymentMethod,
      items_count: priced.priced.itemsCount,
      subtotal: priced.priced.subtotal,
      delivery_fee: priced.priced.deliveryFee,
      discount_amount: priced.priced.discountAmount,
      total_amount: priced.priced.totalAmount,
      coupon_code: priced.priced.couponCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    if (orderType === 'delivery' && !order.delivery_address.trim()) {
      return NextResponse.json({ success: false, error: 'للتوصيل لازم تكتب العنوان بالتفصيل في السلة.' }, { status: 400 });
    }

    const { data, error } = await supabase.from('orders').insert([order]).select();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (priced.priced.couponCode) {
      await incrementCouponUsage(priced.priced.couponCode);
    }

    return NextResponse.json({
      success: true,
      data,
      totals: {
        subtotal: priced.priced.subtotal,
        delivery_fee: priced.priced.deliveryFee,
        discount_amount: priced.priced.discountAmount,
        total_amount: priced.priced.totalAmount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'تعذر حفظ الطلب' },
      { status: 500 }
    );
  }
}
