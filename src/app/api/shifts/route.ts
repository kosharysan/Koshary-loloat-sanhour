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
    const newShiftNumber = Number(body.newShiftNumber) || 1;
    const newArchivedOrderIds = Array.isArray(body.newArchivedOrderIds) ? body.newArchivedOrderIds : [];

    if (!newClosedShift || !newClosedShift.id) {
      return NextResponse.json({ success: false, error: 'بيانات الوردية غير صالحة' }, { status: 400 });
    }

    const settings = (await adminGetSettings()) || {};
    const cloudShifts = settings.closedShifts || [];
    const updatedShifts = [newClosedShift, ...cloudShifts.filter((s: any) => s.id !== newClosedShift.id)];

    const res = await adminSaveSettings({
      ...settings,
      closedShifts: updatedShifts,
      currentShiftStartTime: newShiftStartTime,
      currentShiftNumber: newShiftNumber,
      archivedOrderIds: newArchivedOrderIds,
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
