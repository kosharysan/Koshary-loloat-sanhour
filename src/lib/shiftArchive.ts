import type { ClosedShift } from '@/types';

export type ShiftPeriodFilter =
  | 'recent'
  | 'all'
  | 'specific'
  | 'today'
  | 'week'
  | 'month'
  | 'quarter'
  | 'half_year'
  | 'year'
  | 'custom';

export type ShiftOrderMatch = { order: any; shift: ClosedShift };

const RECENT_SHIFTS_LIMIT = 40;

function shiftTimestamp(shift: ClosedShift): number {
  const raw = shift.closedAt || shift.openedAt || '';
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function sortShiftsNewestFirst(shifts: ClosedShift[]): ClosedShift[] {
  return [...shifts].sort((a, b) => shiftTimestamp(b) - shiftTimestamp(a));
}

export function countArchivedInvoices(shifts: ClosedShift[]): number {
  return shifts.reduce((sum, shift) => {
    const fromSummary = Number(shift.summary?.totalOrders);
    if (Number.isFinite(fromSummary) && fromSummary > 0) return sum + fromSummary;
    if (Array.isArray(shift.orders) && shift.orders.length > 0) return sum + shift.orders.length;
    if (Array.isArray(shift.orderIds) && shift.orderIds.length > 0) return sum + shift.orderIds.length;
    return sum;
  }, 0);
}

export function filterShiftsByPeriod(
  shifts: ClosedShift[],
  options: {
    period?: string | null;
    limit?: number;
    shift?: string | null;
    from?: string | null;
    to?: string | null;
  } = {}
): ClosedShift[] {
  const sorted = sortShiftsNewestFirst(shifts);
  const period = (options.period || 'recent') as ShiftPeriodFilter;
  const selectedShift = String(options.shift || '').trim();

  if (selectedShift && selectedShift !== 'all') {
    return sorted.filter(
      (shift) => String(shift.shiftNumber) === selectedShift || String(shift.id) === selectedShift
    );
  }

  if (period === 'all') return sorted;

  const now = new Date();

  if (period === 'today') {
    const todayStr = now.toISOString().slice(0, 10);
    return sorted.filter((shift) => (shift.closedAt || shift.openedAt || '').startsWith(todayStr));
  }

  if (period === 'week') {
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    return sorted.filter((shift) => shiftTimestamp(shift) >= weekAgo);
  }

  if (period === 'month') {
    const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    return sorted.filter((shift) => shiftTimestamp(shift) >= monthAgo);
  }

  if (period === 'quarter') {
    const quarterAgo = now.getTime() - 90 * 24 * 60 * 60 * 1000;
    return sorted.filter((shift) => shiftTimestamp(shift) >= quarterAgo);
  }

  if (period === 'half_year') {
    const halfYearAgo = now.getTime() - 182 * 24 * 60 * 60 * 1000;
    return sorted.filter((shift) => shiftTimestamp(shift) >= halfYearAgo);
  }

  if (period === 'year') {
    const yearAgo = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    return sorted.filter((shift) => shiftTimestamp(shift) >= yearAgo);
  }

  if (period === 'custom') {
    let list = sorted;
    if (options.from) {
      const startTimestamp = new Date(options.from).setHours(0, 0, 0, 0);
      list = list.filter((shift) => shiftTimestamp(shift) >= startTimestamp);
    }
    if (options.to) {
      const endTimestamp = new Date(options.to).setHours(23, 59, 59, 999);
      list = list.filter((shift) => shiftTimestamp(shift) <= endTimestamp);
    }
    if (!options.from && !options.to) {
      return sorted.slice(0, options.limit || RECENT_SHIFTS_LIMIT);
    }
    return list;
  }

  return sorted.slice(0, options.limit || RECENT_SHIFTS_LIMIT);
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function normalizeSearchQuery(raw: string): { q: string; digits: string } {
  const q = raw.trim().toLowerCase();
  return { q, digits: q.replace(/\D/g, '') };
}

export function orderMatchesQuery(order: any, rawQuery: string): boolean {
  const { q, digits } = normalizeSearchQuery(rawQuery);
  if (!q) return false;

  const name = String(order?.customer_name || '').toLowerCase();
  const phone = String(order?.customer_phone || '').trim();
  const phoneDigits = phone.replace(/\D/g, '');
  const orderId = String(order?.id || '').toLowerCase();
  const address = String(order?.delivery_address || '').toLowerCase();

  return (
    name.includes(q) ||
    phone.includes(q) ||
    (digits.length >= 3 && phoneDigits.includes(digits)) ||
    orderId.includes(q) ||
    address.includes(q)
  );
}

export function searchShiftOrders(
  shifts: ClosedShift[],
  rawQuery: string,
  extraOrders: any[] = []
): ShiftOrderMatch[] {
  const { q } = normalizeSearchQuery(rawQuery);
  if (!q) return [];

  const extraById = new Map(extraOrders.map((order) => [String(order.id), order]));
  const matches: ShiftOrderMatch[] = [];
  const seen = new Set<string>();

  for (const shift of shifts) {
    if (Array.isArray(shift.orders)) {
      for (const order of shift.orders) {
        const id = String(order?.id || '');
        if (!id || seen.has(id) || !orderMatchesQuery(order, rawQuery)) continue;
        seen.add(id);
        matches.push({ order, shift });
      }
    }

    if (Array.isArray(shift.orderIds)) {
      for (const orderId of shift.orderIds) {
        const id = String(orderId || '');
        if (!id || seen.has(id)) continue;
        const extra = extraById.get(id);
        if (!extra || !orderMatchesQuery(extra, rawQuery)) continue;
        seen.add(id);
        matches.push({ order: extra, shift });
      }
    }
  }

  return matches;
}

export function findShiftForOrderId(shifts: ClosedShift[], orderId: string): ClosedShift | undefined {
  const id = String(orderId);
  return shifts.find((shift) => {
    if (Array.isArray(shift.orderIds) && shift.orderIds.some((item) => String(item) === id)) return true;
    if (Array.isArray(shift.orders) && shift.orders.some((order) => String(order?.id) === id)) return true;
    return false;
  });
}

export function buildOrdersSearchFilter(rawQuery: string): string | null {
  const { q, digits } = normalizeSearchQuery(rawQuery);
  if (!q) return null;

  const escaped = escapeIlike(q).replace(/[,()]/g, '');
  if (!escaped) return null;

  const filters = [
    `customer_name.ilike.%${escaped}%`,
    `customer_phone.ilike.%${escaped}%`,
    `delivery_address.ilike.%${escaped}%`,
  ];

  if (/^[0-9a-f-]{8,}$/i.test(q) || /^\d+$/.test(q)) {
    filters.push(`id.eq.${q}`);
  }

  if (digits.length >= 3 && digits !== q) {
    filters.push(`customer_phone.ilike.%${escapeIlike(digits)}%`);
  }

  return filters.join(',');
}
