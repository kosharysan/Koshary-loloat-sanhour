export type ReportTimeFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export type ReportCustomerLimit = 'all' | '50' | '100' | '200';

export type ReportFilters = {
  timeFilter: ReportTimeFilter;
  year: string;
  month: string;
  from?: string;
  to?: string;
  q?: string;
  customerLimit?: ReportCustomerLimit;
};

export type ReportChartBucket = {
  key: string;
  label: string;
  name: string;
  revenue: number;
  confirmedRevenue: number;
  orderCount: number;
  confirmedCount: number;
};

export type ReportItemBucket = {
  key?: string;
  label: string;
  quantity: number;
  revenue: number;
};

export type ReportRankedItem = {
  name: string;
  quantity: number;
  revenue: number;
  orderCount: number;
  chartBuckets: ReportItemBucket[];
};

export type ReportCustomer = {
  phone: string;
  name: string;
  orderCount: number;
  confirmedCount: number;
  totalSpent: number;
  daysSinceLastOrder: number;
};

export type ReportPayload = {
  confirmedCount: number;
  confirmedRevenue: number;
  uniqueConfirmedCustomerCount: number;
  cancelledCount: number;
  cancelledRevenue: number;
  availableYears: number[];
  salesTrend: {
    buckets: ReportChartBucket[];
    isDaily: boolean;
    maxRevenue: number;
    avgRevenue: number;
    totalRevenue: number;
    topPeriod: { name: string; confirmedRevenue: number; confirmedCount: number } | null;
    startDateStr: string;
    endDateStr: string;
  };
  items: ReportRankedItem[];
  totalSoldAllItems: number;
  totalRevenueAllItems: number;
  topItem: ReportRankedItem | null;
  customers: {
    totalCustomers: number;
    activeCount: number;
    inactiveCount: number;
    activePercent: number;
    inactivePercent: number;
    activeList: ReportCustomer[];
    inactiveList: ReportCustomer[];
  };
  paymentMethodStats: { cash: number; wallet: number; instapay: number };
  orderTypeStats: { delivery: number; pickup: number };
};

export const EMPTY_REPORT: ReportPayload = {
  confirmedCount: 0,
  confirmedRevenue: 0,
  uniqueConfirmedCustomerCount: 0,
  cancelledCount: 0,
  cancelledRevenue: 0,
  availableYears: [new Date().getFullYear()],
  salesTrend: {
    buckets: [],
    isDaily: true,
    maxRevenue: 1,
    avgRevenue: 0,
    totalRevenue: 0,
    topPeriod: null,
    startDateStr: 'لا يوجد',
    endDateStr: 'لا يوجد',
  },
  items: [],
  totalSoldAllItems: 0,
  totalRevenueAllItems: 0,
  topItem: null,
  customers: {
    totalCustomers: 0,
    activeCount: 0,
    inactiveCount: 0,
    activePercent: 0,
    inactivePercent: 0,
    activeList: [],
    inactiveList: [],
  },
  paymentMethodStats: { cash: 0, wallet: 0, instapay: 0 },
  orderTypeStats: { delivery: 0, pickup: 0 },
};

function parseOrderItems(specialNotes?: string): string[] {
  if (!specialNotes || !specialNotes.trim()) return [];
  const raw = specialNotes.trim();
  let itemsPart = raw;
  if (raw.includes('ملاحظات العميل:')) {
    itemsPart = raw.split('ملاحظات العميل:')[0];
  } else if (raw.includes('ملاحظات الأوردر:')) {
    itemsPart = raw.split('ملاحظات الأوردر:')[0];
  }
  itemsPart = itemsPart.replace(/^الأصناف:\s*/i, '').trim();
  return itemsPart ? itemsPart.split('\n').map((s) => s.trim()).filter(Boolean) : [];
}

function parseItemSale(itemStr: string): { name: string; quantity: number; price: number } {
  const clean = itemStr.replace(/^\d+[\.\-]\s*/, '').replace(/^[•\-]\s*/, '').trim();
  let nameAndDetails = clean;
  let price = 0;
  if (clean.includes(' — ')) {
    const parts = clean.split(' — ');
    nameAndDetails = parts.slice(0, -1).join(' — ').trim();
    const cleanedPrice = Number(parts[parts.length - 1].replace(/[^\d.]/g, ''));
    if (!Number.isNaN(cleanedPrice)) price = cleanedPrice;
  }
  const detailsStr = nameAndDetails.match(/\[(.*?)\]/)?.[1] || '';
  nameAndDetails = nameAndDetails.replace(/\[.*?\]/, '').trim();
  let quantity = 1;
  const qtyMatch = nameAndDetails.match(/[×xX]\s*(\d+)/);
  if (qtyMatch) {
    quantity = Number(qtyMatch[1]) || 1;
    nameAndDetails = nameAndDetails.replace(/[×xX]\s*\d+/, '').trim();
  }
  const isCustom =
    nameAndDetails.includes('طاجن') ||
    detailsStr.includes('الأساس:') ||
    detailsStr.includes('أساس:') ||
    detailsStr.includes('البروتين:') ||
    detailsStr.includes('بروتين:');
  nameAndDetails = nameAndDetails.replace(/\([^)]+\)/g, '').trim();
  return {
    name: isCustom ? 'طاجن مبتكر خاص' : nameAndDetails.trim() || 'صنف',
    quantity,
    price,
  };
}

function extractOrderSales(order: any): { name: string; quantity: number; price: number }[] {
  const itemsList = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : parseOrderItems(order.special_notes);

  return (itemsList || []).map((it: any) => {
    if (typeof it === 'string') return parseItemSale(it);
    return {
      name: it?.name || it?.item_name || 'صنف',
      quantity: Number(it?.quantity) || 1,
      price: Number(it?.total_price || it?.price) || 0,
    };
  }).filter((item: { name: string }) => Boolean(item.name));
}

function isCancelled(status: unknown): boolean {
  return (
    status === 'cancelled_not_received' ||
    status === 'cancelled_before_dispatch' ||
    status === 'cancelled' ||
    (typeof status === 'string' && status.startsWith('cancelled'))
  );
}

export function orderMatchesReportFilters(order: any, filters: ReportFilters, now = new Date()): boolean {
  const orderDate = new Date(order.created_at || Date.now());

  if (filters.year !== 'all' && orderDate.getFullYear() !== Number(filters.year)) return false;
  if (filters.month !== 'all' && orderDate.getMonth() + 1 !== Number(filters.month)) return false;

  if (filters.timeFilter !== 'all') {
    if (filters.timeFilter === 'today') {
      const isToday =
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate();
      if (!isToday) return false;
    } else if (filters.timeFilter === 'week') {
      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 7) return false;
    } else if (filters.timeFilter === 'month') {
      if (orderDate.getFullYear() !== now.getFullYear() || orderDate.getMonth() !== now.getMonth()) return false;
    } else if (filters.timeFilter === 'year') {
      if (orderDate.getFullYear() !== now.getFullYear()) return false;
    } else if (filters.timeFilter === 'custom') {
      if (filters.from) {
        const start = new Date(filters.from);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }
  }

  const q = String(filters.q || '').toLowerCase().trim();
  if (q) {
    const matchName = String(order.customer_name || '').toLowerCase().includes(q);
    const matchPhone = String(order.customer_phone || '').includes(q);
    const matchId = String(order.id).toLowerCase().includes(q);
    if (!matchName && !matchPhone && !matchId) return false;
  }

  return true;
}

function formatChartLabel(date: Date, isDaily: boolean): string {
  return date.toLocaleDateString('ar-EG-u-nu-latn', isDaily
    ? { day: 'numeric', month: 'short' }
    : { month: 'short', year: 'numeric' });
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function emptyBucket(date: Date, isDaily: boolean): ReportChartBucket {
  const key = isDaily
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const label = formatChartLabel(date, isDaily);
  return {
    key,
    label,
    name: label,
    revenue: 0,
    confirmedRevenue: 0,
    orderCount: 0,
    confirmedCount: 0,
  };
}

function fillItemBuckets(entries: [string, ReportItemBucket][]): ReportItemBucket[] {
  if (entries.length === 0) return [];
  const byKey = new Map(entries);
  const keys = entries.map(([key]) => key).sort();
  const first = new Date(`${keys[0]}T00:00:00`);
  const last = new Date(`${keys[keys.length - 1]}T00:00:00`);
  const start = new Date(first.getFullYear(), first.getMonth(), 1);
  const monthEnd = new Date(last.getFullYear(), last.getMonth() + 1, 0);
  const end = new Date(Math.min(monthEnd.getTime(), Date.now()));
  return eachDay(start, end).map((date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return byKey.get(key) || {
      key,
      label: formatChartLabel(date, true),
      quantity: 0,
      revenue: 0,
    };
  });
}

function fillDailyBuckets(buckets: ReportChartBucket[], firstDate: Date, lastDate: Date): ReportChartBucket[] {
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const start = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const monthEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0);
  const today = new Date();
  const end = new Date(Math.min(monthEnd.getTime(), today.getTime()));
  return eachDay(start, end).map((date) => {
    const empty = emptyBucket(date, true);
    return byKey.get(empty.key) || empty;
  });
}

export function buildReportPayload(allOrders: any[], filters: ReportFilters): ReportPayload {
  const now = new Date();
  const years = new Set<number>();
  const filtered: any[] = [];

  allOrders.forEach((order) => {
    if (order.created_at) {
      const y = new Date(order.created_at).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    }
    if (orderMatchesReportFilters(order, filters, now)) filtered.push(order);
  });

  const confirmed = filtered.filter((order) => order.status === 'confirmed');
  const cancelled = filtered.filter((order) => isCancelled(order.status));

  const confirmedRevenue = confirmed.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
  const cancelledRevenue = cancelled.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
  const uniqueConfirmedCustomerCount = new Set(
    confirmed.map((order) => (order.customer_phone || order.customer_name || '').trim()).filter(Boolean)
  ).size;

  const availableYears = Array.from(years).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(now.getFullYear());

  const salesTrend = buildSalesTrend(confirmed, filters.month);
  const itemsData = buildItemsRanking(confirmed);
  const customers = buildCustomerAnalytics(allOrders, filters.customerLimit);
  const paymentMethodStats = { cash: 0, wallet: 0, instapay: 0 };
  const orderTypeStats = { delivery: 0, pickup: 0 };

  confirmed.forEach((order) => {
    const amt = Number(order.total_amount) || 0;
    if (order.payment_method === 'vodafone_cash') paymentMethodStats.wallet += amt;
    else if (order.payment_method === 'instapay') paymentMethodStats.instapay += amt;
    else paymentMethodStats.cash += amt;
    if (order.order_type === 'delivery') orderTypeStats.delivery += 1;
    else orderTypeStats.pickup += 1;
  });

  return {
    confirmedCount: confirmed.length,
    confirmedRevenue,
    uniqueConfirmedCustomerCount,
    cancelledCount: cancelled.length,
    cancelledRevenue,
    availableYears,
    salesTrend,
    items: itemsData.items,
    totalSoldAllItems: itemsData.totalSoldAllItems,
    totalRevenueAllItems: itemsData.totalRevenueAllItems,
    topItem: itemsData.topItem,
    customers,
    paymentMethodStats,
    orderTypeStats,
  };
}

function buildSalesTrend(confirmedOrders: any[], selectedMonth: string): ReportPayload['salesTrend'] {
  if (confirmedOrders.length === 0) return EMPTY_REPORT.salesTrend;

  const sorted = [...confirmedOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const firstDate = new Date(sorted[0].created_at);
  const lastDate = new Date(sorted[sorted.length - 1].created_at);
  const diffDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  const isDaily = diffDays <= 40 || selectedMonth !== 'all';

  const bucketsMap = new Map<string, ReportChartBucket>();
  sorted.forEach((order) => {
    const d = new Date(order.created_at);
    const amt = Number(order.total_amount) || 0;
    const key = isDaily
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = formatChartLabel(d, isDaily);
    if (!bucketsMap.has(key)) {
      bucketsMap.set(key, {
        key,
        label,
        name: label,
        revenue: 0,
        confirmedRevenue: 0,
        orderCount: 0,
        confirmedCount: 0,
      });
    }
    const bucket = bucketsMap.get(key)!;
    bucket.revenue += amt;
    bucket.confirmedRevenue += amt;
    bucket.orderCount += 1;
    bucket.confirmedCount += 1;
  });

  const rawBuckets = Array.from(bucketsMap.values());
  const buckets = isDaily ? fillDailyBuckets(rawBuckets, firstDate, lastDate) : rawBuckets;
  const liveBuckets = buckets.filter((bucket) => bucket.confirmedCount > 0);
  const revenues = liveBuckets.map((bucket) => bucket.revenue);
  const maxRevenue = Math.max(...buckets.map((bucket) => bucket.revenue), 1);
  const totalRevenue = revenues.reduce((sum, value) => sum + value, 0);
  const avgRevenue = Math.round(totalRevenue / (liveBuckets.length || 1));
  let topBucket = buckets[0];
  buckets.forEach((bucket) => {
    if (bucket.revenue > (topBucket ? topBucket.revenue : 0)) topBucket = bucket;
  });

  return {
    buckets,
    isDaily,
    maxRevenue,
    avgRevenue,
    totalRevenue,
    topPeriod: topBucket
      ? {
          name: topBucket.label,
          confirmedRevenue: topBucket.revenue,
          confirmedCount: topBucket.orderCount,
        }
      : null,
    startDateStr: firstDate.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }),
    endDateStr: lastDate.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

function buildItemsRanking(confirmedOrders: any[]): {
  items: ReportRankedItem[];
  totalSoldAllItems: number;
  totalRevenueAllItems: number;
  topItem: ReportRankedItem | null;
} {
  const itemMap = new Map<string, ReportRankedItem & { dayMap: Map<string, ReportItemBucket> }>();
  let totalRevenueAllItems = 0;

  confirmedOrders.forEach((order) => {
    const d = new Date(order.created_at);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLabel = d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });

    extractOrderSales(order).forEach((sale) => {
      if (!itemMap.has(sale.name)) {
        itemMap.set(sale.name, {
          name: sale.name,
          quantity: 0,
          revenue: 0,
          orderCount: 0,
          chartBuckets: [],
          dayMap: new Map(),
        });
      }
      const record = itemMap.get(sale.name)!;
      record.quantity += sale.quantity;
      record.revenue += sale.price;
      record.orderCount += 1;
      totalRevenueAllItems += sale.price;
      if (!record.dayMap.has(dayKey)) {
        record.dayMap.set(dayKey, { key: dayKey, label: dayLabel, quantity: 0, revenue: 0 });
      }
      const day = record.dayMap.get(dayKey)!;
      day.quantity += sale.quantity;
      day.revenue += sale.price;
    });
  });

  const items = Array.from(itemMap.values())
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      revenue: item.revenue,
      orderCount: item.orderCount,
      chartBuckets: fillItemBuckets(Array.from(item.dayMap.entries())),
    }))
    .sort((a, b) => (b.revenue !== a.revenue ? b.revenue - a.revenue : b.quantity - a.quantity));

  return {
    items,
    totalSoldAllItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalRevenueAllItems,
    topItem: items[0] || null,
  };
}

function customerListLimit(limit?: ReportCustomerLimit): number | null {
  if (limit === '50') return 50;
  if (limit === '100') return 100;
  if (limit === '200') return 200;
  return null;
}

function buildCustomerAnalytics(allOrders: any[], limit?: ReportCustomerLimit): ReportPayload['customers'] {
  const customerMap = new Map<string, ReportCustomer & { lastOrderAt: string }>();
  const nowTime = Date.now();

  allOrders.forEach((order) => {
    const phone = String(order.customer_phone || '').trim();
    if (!phone) return;
    const amt = Number(order.total_amount) || 0;
    const isConfirmed = order.status === 'confirmed';
    if (!customerMap.has(phone)) {
      customerMap.set(phone, {
        phone,
        name: order.customer_name || 'عميل',
        orderCount: 0,
        confirmedCount: 0,
        totalSpent: 0,
        daysSinceLastOrder: 0,
        lastOrderAt: order.created_at || new Date().toISOString(),
      });
    }
    const customer = customerMap.get(phone)!;
    customer.orderCount += 1;
    if (isConfirmed) {
      customer.confirmedCount += 1;
      customer.totalSpent += amt;
    }
    if (order.customer_name && order.customer_name !== 'عميل') {
      customer.name = order.customer_name;
    }
    const orderTime = new Date(order.created_at).getTime();
    if (orderTime > new Date(customer.lastOrderAt).getTime()) {
      customer.lastOrderAt = order.created_at;
    }
  });

  const activeList: ReportCustomer[] = [];
  const inactiveList: ReportCustomer[] = [];
  customerMap.forEach((customer) => {
    const days = Math.floor((nowTime - new Date(customer.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24));
    const row = {
      phone: customer.phone,
      name: customer.name,
      orderCount: customer.orderCount,
      confirmedCount: customer.confirmedCount,
      totalSpent: customer.totalSpent,
      daysSinceLastOrder: days,
    };
    if (days <= 30) activeList.push(row);
    else inactiveList.push(row);
  });

  activeList.sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount);
  inactiveList.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

  const totalCustomers = customerMap.size;
  const maxNames = customerListLimit(limit);
  return {
    totalCustomers,
    activeCount: activeList.length,
    inactiveCount: inactiveList.length,
    activePercent: totalCustomers > 0 ? Math.round((activeList.length / totalCustomers) * 100) : 0,
    inactivePercent: totalCustomers > 0 ? Math.round((inactiveList.length / totalCustomers) * 100) : 0,
    activeList: maxNames ? activeList.slice(0, maxNames) : activeList,
    inactiveList: maxNames ? inactiveList.slice(0, maxNames) : inactiveList,
  };
}
