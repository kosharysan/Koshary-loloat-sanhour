import type { Category, ItemDiscount, MenuItem } from '@/types';

export function money(value: number): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function sanitizeDiscount(raw: unknown): ItemDiscount | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<ItemDiscount>;
  const type: ItemDiscount['type'] = data.type === 'amount' ? 'amount' : 'percent';
  let value = Math.round(Number(data.value) || 0);
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (type === 'percent') value = Math.min(100, value);
  if (!data.isEnabled || value <= 0) return null;
  return { isEnabled: true, type, value };
}

export function applyItemDiscount(base: number, discount: ItemDiscount | null | undefined): number {
  const start = money(base);
  const active = sanitizeDiscount(discount);
  if (!active) return start;
  if (active.type === 'percent') {
    return money(start * (1 - active.value / 100));
  }
  return money(start - active.value);
}

export function resolveItemDiscount(
  item: MenuItem | undefined,
  categories: Category[] | undefined,
  globalDiscount: ItemDiscount | null | undefined,
  options?: { customDish?: boolean }
): { discount: ItemDiscount | null; source: 'item' | 'category' | 'global' | null } {
  if (options?.customDish) {
    const global = sanitizeDiscount(globalDiscount);
    return { discount: global, source: global ? 'global' : null };
  }

  const itemDiscount = sanitizeDiscount(item?.discount);
  if (itemDiscount) return { discount: itemDiscount, source: 'item' };

  const category = (categories || []).find((entry) => entry.id === item?.categoryId);
  const categoryDiscount = sanitizeDiscount(category?.discount);
  if (categoryDiscount) return { discount: categoryDiscount, source: 'category' };

  const global = sanitizeDiscount(globalDiscount);
  if (global) return { discount: global, source: 'global' };

  return { discount: null, source: null };
}

export function catalogMenuUnitPrice(item: MenuItem, selectedSize?: string): number | null {
  if (item.isAvailable === false) return null;
  if (selectedSize && Array.isArray(item.sizes) && item.sizes.length > 0) {
    const size = item.sizes.find((entry) => entry.name === selectedSize);
    if (!size) return null;
    return money(size.price);
  }
  return money(item.price);
}

export function getStorefrontPricing(
  item: MenuItem,
  categories: Category[] | undefined,
  globalDiscount: ItemDiscount | null | undefined,
  selectedSize?: string
) {
  const catalog = catalogMenuUnitPrice(item, selectedSize);
  const safeCatalog = catalog === null ? money(item.price) : catalog;
  const { discount, source } = resolveItemDiscount(item, categories, globalDiscount);
  const sale = applyItemDiscount(safeCatalog, discount);
  if (sale < safeCatalog) {
    return { catalog: safeCatalog, sale, hasDiscount: true, discount, source };
  }
  return { catalog: safeCatalog, sale: safeCatalog, hasDiscount: false, discount: null, source: null };
}

export function formatDiscountLabel(discount: ItemDiscount | null | undefined): string {
  const active = sanitizeDiscount(discount);
  if (!active) return '';
  return active.type === 'percent' ? `خصم ${active.value}%` : `خصم ${active.value} ج.م`;
}
