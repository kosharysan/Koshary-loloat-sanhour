import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { adminGetSettings, adminSaveSettings, getServiceSupabase } from '@/lib/supabaseAdmin';
import {
  buildOrdersSearchFilter,
  countArchivedInvoices,
  filterShiftsByPeriod,
  findShiftForOrderId,
  searchShiftOrders,
} from '@/lib/shiftArchive';

export async function GET(req: NextRequest) {
  const session = requireSession(req, ['admin', 'monitor']);
  if (session instanceof NextResponse) return session;

  const settings = (await adminGetSettings()) || {};
  const allClosedShifts = settings.closedShifts || [];
  const currentShiftStartTime = settings.currentShiftStartTime || '';
  const currentShiftNumber = Number(settings.currentShiftNumber) || (allClosedShifts.length + 1);
  const archivedOrderIds = settings.archivedOrderIds || [];
  const totalClosedShifts = allClosedShifts.length;
  const totalArchivedInvoices = countArchivedInvoices(allClosedShifts);

  const view = req.nextUrl.searchParams.get('view') || '';
  const period = req.nextUrl.searchParams.get('period');
  const query = String(req.nextUrl.searchParams.get('q') || '').trim();

  if (view === 'meta') {
    return NextResponse.json({
      success: true,
      closedShifts: [],
      currentShiftStartTime,
      currentShiftNumber,
      archivedOrderIds,
      totalClosedShifts,
      totalArchivedInvoices,
    });
  }

  if (query) {
    const snapshotMatches = searchShiftOrders(allClosedShifts, query);
    const seen = new Set(snapshotMatches.map((item) => String(item.order?.id)));
    const matches = [...snapshotMatches];

    const supabase = getServiceSupabase();
    const filter = buildOrdersSearchFilter(query);
    if (supabase && filter) {
      try {
        const result = await supabase
          .from('orders')
          .select('*')
          .or(filter)
          .order('created_at', { ascending: false });

        if (!result.error && Array.isArray(result.data)) {
          for (const order of result.data) {
            const id = String(order?.id || '');
            if (!id || seen.has(id)) continue;
            const shift = findShiftForOrderId(allClosedShifts, id);
            if (!shift) continue;
            seen.add(id);
            matches.push({ order, shift });
          }
        }
      } catch {
        // Snapshot matches are enough if the orders table search fails.
      }
    }

    return NextResponse.json({
      success: true,
      closedShifts: [],
      currentShiftStartTime,
      currentShiftNumber,
      archivedOrderIds: [],
      totalClosedShifts,
      totalArchivedInvoices,
      customerMatches: matches,
      totalMatches: matches.length,
    });
  }

  const closedShifts = period
    ? filterShiftsByPeriod(allClosedShifts, {
        period,
        limit: Number(req.nextUrl.searchParams.get('limit')) || 40,
        shift: req.nextUrl.searchParams.get('shift'),
        from: req.nextUrl.searchParams.get('from'),
        to: req.nextUrl.searchParams.get('to'),
      })
    : allClosedShifts;

  return NextResponse.json({
    success: true,
    closedShifts,
    currentShiftStartTime,
    currentShiftNumber,
    archivedOrderIds: period ? [] : archivedOrderIds,
    totalClosedShifts,
    totalArchivedInvoices,
  });
}

export async function POST(req: NextRequest) {
  const session = requireSession(req, ['admin', 'monitor']);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const newClosedShift = body.newClosedShift;
    const newShiftStartTime = String(body.newShiftStartTime || '');

    if (!newClosedShift || typeof newClosedShift !== 'object' || !newClosedShift.id) {
      return NextResponse.json({ success: false, error: 'بيانات الوردية غير صالحة' }, { status: 400 });
    }

    const shiftId = String(newClosedShift.id);
    if (!/^shift-\d+-\d+$/.test(shiftId)) {
      return NextResponse.json({ success: false, error: 'معرف الوردية غير صالح' }, { status: 400 });
    }

    const orderIds = Array.isArray(newClosedShift.orderIds)
      ? [...new Set(newClosedShift.orderIds.map((id: unknown) => String(id || '').trim()).filter(Boolean))].slice(0, 5000)
      : [];
    if (orderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'الوردية فارغة ولا يمكن تقفيلها' }, { status: 400 });
    }

    const settings = (await adminGetSettings()) || {};
    const cloudShifts = Array.isArray(settings.closedShifts) ? settings.closedShifts : [];
    if (cloudShifts.some((s: any) => String(s.id) === shiftId)) {
      return NextResponse.json({ success: false, error: 'الوردية دي اتقفلت قبل كده' }, { status: 409 });
    }

    const currentShiftNumber = Number(settings.currentShiftNumber) || (cloudShifts.length + 1);
    const nextShiftNumber = currentShiftNumber + 1;
    const existingArchived: string[] = Array.isArray(settings.archivedOrderIds)
      ? settings.archivedOrderIds.map(String)
      : [];
    const archivedOrderIds = [...new Set([...existingArchived, ...orderIds])];

    const sanitizedShift = {
      ...newClosedShift,
      id: shiftId,
      orderIds,
      shiftNumber: Number(newClosedShift.shiftNumber) || currentShiftNumber,
      openedAt: String(newClosedShift.openedAt || newShiftStartTime || new Date().toISOString()),
      closedAt: String(newClosedShift.closedAt || new Date().toISOString()),
      closedBy: String(newClosedShift.closedBy || '').slice(0, 80),
      summary: newClosedShift.summary && typeof newClosedShift.summary === 'object' ? newClosedShift.summary : {},
      orders: Array.isArray(newClosedShift.orders) ? newClosedShift.orders.slice(0, orderIds.length) : [],
    };

    const updatedShifts = [sanitizedShift, ...cloudShifts];

    const res = await adminSaveSettings({
      ...settings,
      closedShifts: updatedShifts,
      currentShiftStartTime: newShiftStartTime || new Date().toISOString(),
      currentShiftNumber: nextShiftNumber,
      archivedOrderIds,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'تعذر تقفيل الوردية' },
      { status: 500 }
    );
  }
}
