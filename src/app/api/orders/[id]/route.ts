import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { adminGetSettings, adminSaveSettings, getServiceSupabase } from '@/lib/supabaseAdmin';

const ALLOWED_STATUSES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'cancelled',
  'cancelled_before_dispatch',
  'cancelled_not_received',
]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req, ['admin', 'monitor']);
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const newStatus = String(body.status || '').trim();
  if (!ALLOWED_STATUSES.has(newStatus)) {
    return NextResponse.json({ success: false, error: 'حالة الطلب غير صالحة' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
  }

  await supabase.from('orders').update({ status: newStatus }).eq('id', id);

  const settings = (await adminGetSettings()) || {};
  const cloudOverrides = { ...(settings.orderStatusOverrides || {}), [id]: newStatus };
  await adminSaveSettings({ ...settings, orderStatusOverrides: cloudOverrides });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req, ['admin']);
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
  }

  await supabase.from('orders').delete().eq('id', id);

  const settings = (await adminGetSettings()) || {};
  const cloudDeleted: string[] = settings.deletedOrderIds || [];
  if (!cloudDeleted.includes(id)) {
    await adminSaveSettings({
      ...settings,
      deletedOrderIds: [...cloudDeleted, id],
    });
  }

  return NextResponse.json({ success: true });
}
