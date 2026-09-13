import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { adminGetSettings, getServiceSupabase } from '@/lib/supabaseAdmin';
import { buildReportPayload, type ReportTimeFilter } from '@/lib/reportStats';

async function fetchAllOrders(supabase: ReturnType<typeof getServiceSupabase>) {
  if (!supabase) return [];
  const pageSize = 1000;
  let from = 0;
  const rows: any[] = [];

  while (true) {
    const result = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const chunk = result.data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function GET(req: NextRequest) {
  const session = requireSession(req, ['admin']);
  if (session instanceof NextResponse) return session;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 503 });
  }

  const timeFilter = (req.nextUrl.searchParams.get('period') || 'month') as ReportTimeFilter;
  const year = req.nextUrl.searchParams.get('year') || 'all';
  const month = req.nextUrl.searchParams.get('month') || 'all';
  const from = req.nextUrl.searchParams.get('from') || '';
  const to = req.nextUrl.searchParams.get('to') || '';
  const q = req.nextUrl.searchParams.get('q') || '';
  const customerLimitRaw = req.nextUrl.searchParams.get('customerLimit') || '50';
  const customerLimit = ['all', '50', '100', '200'].includes(customerLimitRaw)
    ? (customerLimitRaw as 'all' | '50' | '100' | '200')
    : 'all';

  try {
    const settings = (await adminGetSettings()) || {};
    const cloudOverrides: Record<string, string> = settings.orderStatusOverrides || {};
    const deletedSet = new Set((settings.deletedOrderIds || []).map(String));
    const data = await fetchAllOrders(supabase);

    const merged = data
      .filter((order: any) => !deletedSet.has(String(order.id)))
      .map((order: any) => {
        const override = cloudOverrides[order.id];
        return override ? { ...order, status: override } : order;
      });

    const report = buildReportPayload(merged, {
      timeFilter: ['today', 'week', 'month', 'year', 'all', 'custom'].includes(timeFilter)
        ? timeFilter
        : 'month',
      year,
      month,
      from,
      to,
      q,
      customerLimit,
    });

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'تعذر تجهيز التقرير' },
      { status: 500 }
    );
  }
}
