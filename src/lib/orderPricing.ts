import type { Coupon, CustomDishDetails, DeliveryZone, MenuItem } from '@/types';

export type IncomingCartLine = {
  menuItemId?: string;
  quantity?: number;
  selectedSize?: string;
  customDishDetails?: CustomDishDetails;
  extras?: Array<{ name?: string; price?: number }>;
};

export type PricedOrder = {
  itemsCount: number;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
  deliveryZoneName: string;
};

const MAX_LINES = 200;
const MAX_QTY = 2000;

function money(value: number): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

function findMenuItem(items: MenuItem[], id: string): MenuItem | undefined {
  return items.find((item) => item.id === id);
}

function linePriceFromMenu(item: MenuItem, selectedSize?: string): number | null {
  if (item.isAvailable === false) return null;
  if (selectedSize && Array.isArray(item.sizes) && item.sizes.length > 0) {
    const size = item.sizes.find((entry) => entry.name === selectedSize);
    if (!size) return null;
    return money(size.price);
  }
  return money(item.price);
}

function priceCustomDish(
  details: CustomDishDetails | undefined,
  settings: Record<string, any>
): number | null {
  const builder = settings.dishBuilderSettings;
  if (!builder || builder.isEnabled === false) return null;
  if (!details?.base || !details?.meat) return null;

  const base = (builder.bases || []).find((entry: any) => entry?.name === details.base);
  const meat = (builder.proteins || []).find((entry: any) => entry?.name === details.meat);
  if (!base || !meat) return null;

  let toppingsTotal = 0;
  for (const toppingName of details.toppings || []) {
    const topping = (builder.toppings || []).find((entry: any) => entry?.name === toppingName);
    if (!topping) return null;
    toppingsTotal += money(topping.price);
  }

  return money(base.price) + money(meat.price) + toppingsTotal;
}

function extraPriceFromMenu(name: string, items: MenuItem[]): number | null {
  const match = items.find((item) => item.name === name && item.isAvailable !== false);
  if (!match) return null;
  return money(match.price);
}

export function resolveCartLineUnitPrice(
  line: IncomingCartLine,
  settings: Record<string, any>
): { ok: true; price: number } | { ok: false; error: string } {
  const menuItems = Array.isArray(settings.items) ? (settings.items as MenuItem[]) : [];
  const isCustom = Boolean(line.customDishDetails) || String(line.menuItemId || '').startsWith('custom-dish');
  let unit = 0;

  if (isCustom) {
    const customPrice = priceCustomDish(line.customDishDetails, settings);
    if (customPrice === null) return { ok: false, error: 'تفاصيل الطاجن المبتكر اتغيرت. امسحه من السلة وابنِه من جديد.' };
    unit = customPrice;
  } else {
    const menuItem = findMenuItem(menuItems, String(line.menuItemId || ''));
    if (!menuItem) return { ok: false, error: 'أحد الأصناف في السلة لم يعد موجودًا في المنيو. امسحه وأضف بديلًا.' };
    const menuPrice = linePriceFromMenu(menuItem, line.selectedSize);
    if (menuPrice === null) return { ok: false, error: `الصنف «${menuItem.name}» غير متاح حاليًا. امسحه من السلة.` };
    unit = menuPrice;
  }

  if (Array.isArray(line.extras)) {
    for (const extra of line.extras) {
      const extraName = String(extra?.name || '').trim();
      if (!extraName) return { ok: false, error: 'إضافة في السلة غير صحيحة. امسح الصنف وأضفه من جديد.' };
      const extraPrice = extraPriceFromMenu(extraName, menuItems);
      if (extraPrice === null) return { ok: false, error: `الإضافة «${extraName}» لم تعد متاحة. امسحها من السلة.` };
      unit += extraPrice;
    }
  }

  return { ok: true, price: unit };
}

export function validateCouponForSubtotal(
  settings: Record<string, any>,
  code: string | null,
  subtotal: number
): { coupon: Coupon | null; discount: number; error?: string } {
  if (!code) return { coupon: null, discount: 0 };
  if (settings.isCouponsEnabled === false) {
    return { coupon: null, discount: 0, error: 'الكوبونات متوقفة حاليًا. امسح الكوبون من السلة ثم أرسل الطلب.' };
  }

  const coupons = Array.isArray(settings.coupons) ? (settings.coupons as Coupon[]) : [];
  const coupon = coupons.find((entry) => String(entry.code || '').trim().toUpperCase() === code);
  if (!coupon) return { coupon: null, discount: 0, error: 'كود الخصم غير صحيح. امسحه من السلة أو اكتب كود تاني.' };
  if (!coupon.isActive) return { coupon: null, discount: 0, error: 'الكوبون ده مش شغال دلوقتي. امسحه من السلة ثم أرسل الطلب.' };

  if (coupon.expiresAt) {
    const expireTime = new Date(coupon.expiresAt).getTime();
    if (!Number.isNaN(expireTime) && Date.now() > expireTime) {
      return { coupon: null, discount: 0, error: 'الكوبون منتهي. امسحه من السلة ثم أرسل الطلب.' };
    }
  }

  if (typeof coupon.maxUses === 'number' && coupon.maxUses > 0 && (coupon.usedCount || 0) >= coupon.maxUses) {
    return { coupon: null, discount: 0, error: 'الكوبون خلص عدد مرات الاستخدام. امسحه من السلة ثم أرسل الطلب.' };
  }

  if (coupon.minOrderAmount && coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
    return {
      coupon: null,
      discount: 0,
      error: `الكوبون يشتغل من ${coupon.minOrderAmount} ج.م. أضف أصنافًا أو امسح الكوبون ثم أرسل الطلب.`,
    };
  }

  const discount = coupon.discountType === 'fixed'
    ? money(coupon.discountValue)
    : money((subtotal * Number(coupon.discountValue || 0)) / 100);

  return { coupon, discount: Math.min(subtotal, discount) };
}

export function priceIncomingOrder(
  settings: Record<string, any>,
  input: {
    items: IncomingCartLine[];
    orderType: 'delivery' | 'pickup';
    selectedZoneId?: string;
    deliveryZoneName?: string;
    couponCode?: string | null;
    paymentMethod: 'cash' | 'vodafone_cash' | 'instapay';
  }
): { ok: true; priced: PricedOrder } | { ok: false; error: string } {
  const zones = Array.isArray(settings.deliveryZones) ? (settings.deliveryZones as DeliveryZone[]) : [];
  const lines = Array.isArray(input.items) ? input.items : [];

  if (lines.length === 0) return { ok: false, error: 'السلة فارغة. أضف صنفًا واحدًا على الأقل قبل إرسال الطلب.' };
  if (lines.length > MAX_LINES) return { ok: false, error: 'عدد الأصناف في السلة أكبر من اللازم. لو طلب عزومة كبير جدًا، كلم المطعم على واتساب.' };

  let subtotal = 0;
  let itemsCount = 0;

  for (const line of lines) {
    const quantity = Math.floor(Number(line.quantity) || 0);
    if (quantity < 1) {
      return { ok: false, error: 'كمية أحد الأصناف غير صحيحة. زوّدها من السلة ثم أعد الإرسال.' };
    }
    if (quantity > MAX_QTY) {
      return { ok: false, error: 'الكمية المكتوبة أكبر من المعقول. لو طلب عزومة كبير، كلم المطعم على واتساب ونسجّله يدوي.' };
    }

    const priced = resolveCartLineUnitPrice(line, settings);
    if (!priced.ok) return priced;
    subtotal += priced.price * quantity;
    itemsCount += quantity;
  }

  if (itemsCount < 1) return { ok: false, error: 'السلة فارغة. أضف صنفًا واحدًا على الأقل قبل إرسال الطلب.' };

  let deliveryFee = 0;
  let deliveryZoneName = input.orderType === 'pickup' ? 'استلام من المطعم (تيك أواي)' : '';
  let selectedZone: DeliveryZone | undefined;

  if (input.orderType === 'delivery') {
    selectedZone = zones.find((zone) => zone.id === input.selectedZoneId)
      || zones.find((zone) => zone.name === input.deliveryZoneName)
      || zones[0];
    if (!selectedZone) return { ok: false, error: 'اختَر منطقة التوصيل من السلة ثم أعد إرسال الطلب.' };
    deliveryFee = money(selectedZone.fee);
    deliveryZoneName = selectedZone.name;
    if (settings.isMinOrderEnabled !== false && selectedZone.minOrder > 0 && subtotal < selectedZone.minOrder) {
      return {
        ok: false,
        error: `التوصيل لمنطقة ${selectedZone.name} يبدأ من ${selectedZone.minOrder} ج.م. أضف أصنافًا لحد ما الطلب يوصل المبلغ.`,
      };
    }
  }

  if (input.paymentMethod === 'vodafone_cash' && settings.isWalletPaymentEnabled !== true) {
    return { ok: false, error: 'الدفع بالمحفظة متوقف حاليًا. اختَر الدفع كاش ثم أعد الإرسال.' };
  }
  if (input.paymentMethod === 'instapay' && settings.isInstapayPaymentEnabled !== true) {
    return { ok: false, error: 'الدفع بإنستاباي متوقف حاليًا. اختَر الدفع كاش ثم أعد الإرسال.' };
  }

  const couponCode = input.couponCode ? String(input.couponCode).trim().toUpperCase() : null;
  const couponResult = validateCouponForSubtotal(settings, couponCode, subtotal);
  if (couponResult.error) return { ok: false, error: couponResult.error };

  const discountAmount = couponResult.discount;
  const totalAmount = Math.max(0, subtotal + deliveryFee - discountAmount);

  return {
    ok: true,
    priced: {
      itemsCount,
      subtotal,
      deliveryFee,
      discountAmount,
      totalAmount,
      couponCode: couponResult.coupon ? String(couponResult.coupon.code).toUpperCase() : null,
      deliveryZoneName,
    },
  };
}
