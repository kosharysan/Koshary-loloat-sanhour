import { createClient } from '@supabase/supabase-js';
import { ClosedShift } from '@/types';
import { filterShiftsByPeriod, type ShiftPeriodFilter } from '@/lib/shiftArchive';
import { EMPTY_REPORT, type ReportCustomerLimit, type ReportPayload, type ReportTimeFilter } from '@/lib/reportStats';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const LOCAL_ORDERS_KEY = 'loloat_sanhour_admin_orders';
const LOCAL_CURRENT_ORDERS_KEY = 'loloat_sanhour_current_shift_orders';
const LOCAL_STATUS_OVERRIDES_KEY = 'loloat_orders_status_overrides';
const LOCAL_DELETED_ORDERS_KEY = 'loloat_deleted_order_ids';
const LOCAL_SHIFTS_KEY = 'loloat_closed_shifts';
const LOCAL_CURRENT_SHIFT_START_KEY = 'loloat_current_shift_start';
const LOCAL_CURRENT_SHIFT_NUM_KEY = 'loloat_current_shift_number';
const LOCAL_ARCHIVED_ORDER_IDS_KEY = 'loloat_archived_order_ids';

async function apiFetch<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, data };
}

export async function saveOrderToSupabase(orderData: any) {
  try {
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const newOrder = {
        ...orderData,
        id: orderData.id || `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([newOrder, ...existing]));
    }
  } catch (e) {
    console.error('Error caching order locally:', e);
  }

  const { ok, data } = await apiFetch<{
    success: boolean;
    error?: string;
    data?: any;
    totals?: { subtotal: number; delivery_fee: number; discount_amount: number; total_amount: number };
  }>(
    '/api/orders',
    { method: 'POST', body: JSON.stringify(orderData) }
  );

  if (!ok || !data?.success) {
    return { success: false, error: data && 'error' in data ? data.error : 'تعذر حفظ الطلب' };
  }
  return { success: true, mode: 'live', data: data.data, totals: data.totals };
}

export async function warmupSupabase() {
  try {
    await fetch('/api/menu', { credentials: 'include' });
  } catch {}
}

function readLocalOrdersCache(scope: 'all' | 'current' = 'all'): any[] {
  if (typeof window === 'undefined') return [];
  const key = scope === 'current' ? LOCAL_CURRENT_ORDERS_KEY : LOCAL_ORDERS_KEY;
  try {
    const local = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(local) ? local : [];
  } catch {
    return [];
  }
}

export async function fetchOrdersFromDatabase(
  options?: { scope?: 'all' | 'current' }
): Promise<{ orders: any[]; stale: boolean }> {
  const scope = options?.scope === 'current' ? 'current' : 'all';
  const path = scope === 'current' ? '/api/orders?scope=current' : '/api/orders';
  const cacheKey = scope === 'current' ? LOCAL_CURRENT_ORDERS_KEY : LOCAL_ORDERS_KEY;

  const { ok, data } = await apiFetch<{ success: boolean; data?: any[] }>(path);
  if (ok && data && Array.isArray(data.data)) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data.data));
      } catch {}
    }
    return { orders: data.data, stale: false };
  }
  return { orders: readLocalOrdersCache(scope), stale: true };
}

export async function updateOrderStatusInDb(orderId: string, newStatus: string) {
  if (typeof window !== 'undefined') {
    try {
      const overrides = JSON.parse(localStorage.getItem(LOCAL_STATUS_OVERRIDES_KEY) || '{}');
      overrides[orderId] = newStatus;
      localStorage.setItem(LOCAL_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));

      const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const updated = orders.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));

      const currentOrders = JSON.parse(localStorage.getItem(LOCAL_CURRENT_ORDERS_KEY) || '[]');
      if (Array.isArray(currentOrders) && currentOrders.length > 0) {
        localStorage.setItem(
          LOCAL_CURRENT_ORDERS_KEY,
          JSON.stringify(currentOrders.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o)))
        );
      }
    } catch {}
  }

  const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    { method: 'PATCH', body: JSON.stringify({ status: newStatus }) }
  );
  if (!ok || !data?.success) {
    console.warn('Failed to update order status:', data && 'error' in data ? data.error : '');
  }
}

export async function deleteOrderFromDatabase(orderId: string) {
  if (typeof window !== 'undefined') {
    try {
      const deleted = JSON.parse(localStorage.getItem(LOCAL_DELETED_ORDERS_KEY) || '[]');
      if (!deleted.includes(orderId)) {
        localStorage.setItem(LOCAL_DELETED_ORDERS_KEY, JSON.stringify([...deleted, orderId]));
      }
      const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders.filter((o: any) => o.id !== orderId)));
    } catch {}
  }

  const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    { method: 'DELETE' }
  );
  if (!ok || !data?.success) {
    console.warn('Failed to delete order:', data && 'error' in data ? data.error : '');
  }
}

export async function fetchReportFromServer(options: {
  period: ReportTimeFilter;
  year?: string;
  month?: string;
  from?: string;
  to?: string;
  q?: string;
  customerLimit?: ReportCustomerLimit;
}): Promise<{ report: ReportPayload; stale: boolean }> {
  const params = new URLSearchParams();
  params.set('period', options.period);
  if (options.year) params.set('year', options.year);
  if (options.month) params.set('month', options.month);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.q) params.set('q', options.q);
  if (options.customerLimit) params.set('customerLimit', options.customerLimit);

  const { ok, data } = await apiFetch<{ success: boolean; report?: ReportPayload; error?: string }>(
    `/api/reports?${params.toString()}`
  );
  if (ok && data?.success && data.report) {
    return { report: data.report, stale: false };
  }
  return { report: EMPTY_REPORT, stale: true };
}

export async function fetchRestaurantSettingsFromDb(): Promise<any | null> {
  const { ok, data } = await apiFetch<{ success: boolean; data?: any }>('/api/menu');
  if (!ok || !data?.success) return null;
  return data.data || null;
}

export async function saveRestaurantSettingsToDb(menuData: any): Promise<{ success: boolean; error?: string }> {
  const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
    '/api/settings',
    { method: 'PUT', body: JSON.stringify(menuData) }
  );
  if (!ok || !data?.success) {
    return { success: false, error: data && 'error' in data ? data.error : 'تعذر الحفظ في السيرفر' };
  }
  return { success: true };
}

export type FetchShiftsOptions = {
  period?: ShiftPeriodFilter;
  limit?: number;
  shift?: string;
  from?: string;
  to?: string;
  q?: string;
  view?: 'full' | 'meta';
};

export async function fetchShiftsData(options?: FetchShiftsOptions): Promise<{
  closedShifts: ClosedShift[];
  currentShiftStartTime: string;
  currentShiftNumber: number;
  archivedOrderIds: string[];
  totalClosedShifts: number;
  totalArchivedInvoices: number;
  customerMatches: { order: any; shift: ClosedShift }[];
  totalMatches: number;
}> {
  const params = new URLSearchParams();
  if (options?.view) params.set('view', options.view);
  if (options?.period) params.set('period', options.period);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.shift && options.shift !== 'all') params.set('shift', options.shift);
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.q) params.set('q', options.q);

  const query = params.toString();
  const { ok, data } = await apiFetch<{
    success: boolean;
    closedShifts?: ClosedShift[];
    currentShiftStartTime?: string;
    currentShiftNumber?: number;
    archivedOrderIds?: string[];
    totalClosedShifts?: number;
    totalArchivedInvoices?: number;
    customerMatches?: { order: any; shift: ClosedShift }[];
    totalMatches?: number;
  }>(query ? `/api/shifts?${query}` : '/api/shifts');

  if (ok && data?.success) {
    const result = {
      closedShifts: data.closedShifts || [],
      currentShiftStartTime: data.currentShiftStartTime || '',
      currentShiftNumber: Number(data.currentShiftNumber) || 1,
      archivedOrderIds: data.archivedOrderIds || [],
      totalClosedShifts: Number(data.totalClosedShifts) || (data.closedShifts || []).length,
      totalArchivedInvoices: Number(data.totalArchivedInvoices) || 0,
      customerMatches: data.customerMatches || [],
      totalMatches: Number(data.totalMatches) || (data.customerMatches || []).length,
    };
    if (typeof window !== 'undefined') {
      try {
        if (!options?.view && !options?.period && !options?.q) {
          localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(result.closedShifts));
        }
        localStorage.setItem(LOCAL_CURRENT_SHIFT_START_KEY, result.currentShiftStartTime);
        localStorage.setItem(LOCAL_CURRENT_SHIFT_NUM_KEY, String(result.currentShiftNumber));
        if (result.archivedOrderIds.length > 0) {
          localStorage.setItem(LOCAL_ARCHIVED_ORDER_IDS_KEY, JSON.stringify(result.archivedOrderIds));
        }
      } catch {}
    }
    return result;
  }

  let localShifts: ClosedShift[] = [];
  let localStartTime = '';
  let localShiftNumber = 1;
  let localArchivedIds: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      localShifts = JSON.parse(localStorage.getItem(LOCAL_SHIFTS_KEY) || '[]');
      localStartTime = localStorage.getItem(LOCAL_CURRENT_SHIFT_START_KEY) || '';
      localShiftNumber = Number(localStorage.getItem(LOCAL_CURRENT_SHIFT_NUM_KEY)) || (localShifts.length + 1);
      localArchivedIds = JSON.parse(localStorage.getItem(LOCAL_ARCHIVED_ORDER_IDS_KEY) || '[]');
    } catch {}
  }

  const filtered = options?.q || !options?.period
    ? localShifts
    : filterShiftsByPeriod(localShifts, {
        period: options.period,
        limit: options.limit,
        shift: options.shift,
        from: options.from,
        to: options.to,
      });

  return {
    closedShifts: options?.view === 'meta' ? [] : filtered,
    currentShiftStartTime: localStartTime || new Date().toISOString(),
    currentShiftNumber: localShiftNumber,
    archivedOrderIds: localArchivedIds,
    totalClosedShifts: localShifts.length,
    totalArchivedInvoices: 0,
    customerMatches: [],
    totalMatches: 0,
  };
}

export async function closeShiftInDatabase(
  newClosedShift: ClosedShift,
  newShiftStartTime: string,
  newShiftNumber: number,
  newArchivedOrderIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_SHIFTS_KEY) || '[]');
      const updatedShifts = [newClosedShift, ...existing.filter((s: any) => s.id !== newClosedShift.id)];
      localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(updatedShifts));
      localStorage.setItem(LOCAL_CURRENT_SHIFT_START_KEY, newShiftStartTime);
      localStorage.setItem(LOCAL_CURRENT_SHIFT_NUM_KEY, String(newShiftNumber));
      localStorage.setItem(LOCAL_ARCHIVED_ORDER_IDS_KEY, JSON.stringify(newArchivedOrderIds));
    } catch (e) {
      console.error('Failed to cache closed shift locally:', e);
    }
  }

  const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
    '/api/shifts',
    {
      method: 'POST',
      body: JSON.stringify({
        newClosedShift,
        newShiftStartTime,
        newShiftNumber,
        newArchivedOrderIds,
      }),
    }
  );

  if (!ok || !data?.success) {
    return { success: false, error: data && 'error' in data ? data.error : 'تعذر تقفيل الوردية' };
  }
  return { success: true };
}
