export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  description?: string;
  displayOrder: number;
  isKoshary?: boolean;
  isExtras?: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  isAvailable: boolean;
  displayOrder?: number;
  isPopular?: boolean;
  isSpicy?: boolean;
  tags?: string[];
  sizes?: {
    name: string;
    price: number;
  }[];
  customizations?: {
    id: string;
    name: string;
    options: {
      name: string;
      price: number;
    }[];
  }[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  estimatedMinutes: string;
}

export interface CustomDishDetails {
  base: string;
  meat: string;
  spice: string;
  toppings: string[];
  noOptions?: string[];
  customNotes?: string[];
}

export interface CartItem {
  id: string;
  menuItemId: string;
  categoryId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  selectedSize?: string;
  notes?: string;
  itemNotes?: string[];
  customDishDetails?: CustomDishDetails;
  extras?: {
    name: string;
    price: number;
  }[];
}

export type OrderType = 'delivery' | 'pickup';
export type PaymentMethod = 'cash' | 'vodafone_cash' | 'instapay';

export interface CustomerInfo {
  name: string;
  phone: string;
  zoneId: string;
  address: string;
  buildingFloorNotes?: string;
  orderNotes?: string;
}

export interface RestaurantInfo {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  googleMapsUrl?: string;
  workingHours: string;
  isOpen: boolean;
  logoUrl: string;
  coverUrl: string;
  cashWalletNumber: string;
  cashWalletName: string;
  instapayHandle: string;
  instapayLink: string;
}

export interface MarketingSubFilter {
  id: string;
  name: string;
  icon: string;
  isEnabled: boolean;
  color?: string;
  description?: string;
}

export interface DishBuilderOption {
  id: string;
  name: string;
  price: number;
  displayOrder?: number;
  hasNoOptions?: boolean; // تفعيل ظهور قائمة "بدون" لهذا البند (خاص بالأساس)
  noOptions?: string[];   // البنود المحددة لـ "بدون" لهذا البند
}

export interface DishBuilderSettings {
  isEnabled: boolean;
  bases: DishBuilderOption[];
  proteins: DishBuilderOption[];
  toppings: DishBuilderOption[];
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  minOrderAmount?: number;
  isActive: boolean;
  createdAt: string;
  note?: string;
}

export interface CartIncentiveSettings {
  isEnabled: boolean;
  targetAmount: number; // المبلغ المطلوب للوصول للهدية (مثال: 75 أو 150)
  rewardText: string;   // اسم الهدية (مثال: "تحلية أو كانز هدية")
  rewardIcon: string;   // أيقونة العرض (🎁 / 🥤 / 🍮 / 🛵 / 👑)
  preGoalMessage?: string; // رسالة التحفيز قبل الوصول
  postGoalMessage?: string; // رسالة التهنئة عند الحصول على الهدية
  includeInWhatsApp?: boolean; // تضمين الهدية في فاتورة الواتساب للمطبخ
}

export interface StoreScheduleSettings {
  mode: 'manual' | 'auto'; // 'manual' = يدوي, 'auto' = تلقائي بالمواعيد
  manualIsOpen: boolean;   // حالة التشغيل عند تفعيل الوضع اليدوي
  openTime: string;        // صيغة "HH:mm" مثل "10:00"
  closeTime: string;       // صيغة "HH:mm" مثل "02:00" (قد يتعدى منتصف الليل)
  vacationDays: number[];  // 0 = الأحد, 1 = الإثنين, ..., 5 = الجمعة, 6 = السبت
  customClosedMessage?: string; // رسالة مخصصة عند الإغلاق أو الإجازة
}

export interface StoreStatusResult {
  isOpen: boolean;
  reason: 'open' | 'manual_closed' | 'scheduled_closed' | 'vacation';
  badgeText: string;
  detailText: string;
}

