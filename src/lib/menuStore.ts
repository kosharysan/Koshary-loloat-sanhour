import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MenuItem, Category, MarketingSubFilter, DishBuilderOption, DishBuilderSettings, Coupon, CartIncentiveSettings, DeliveryZone, StoreScheduleSettings, StoreStatusResult, WhatsAppNotificationSettings } from '@/types';
import { menuItems as defaultMenuItems, categories as defaultCategories, restaurantInfo, deliveryZones as defaultDeliveryZones } from '@/data/mockData';
import { fetchRestaurantSettingsFromDb, saveRestaurantSettingsToDb } from '@/lib/supabase';
import { defaultConfirmNotificationTemplate, defaultCancelNotificationTemplate } from '@/lib/whatsapp';
import { normalizeInstapayLink } from '@/lib/contactLinks';

export const defaultWhatsAppNotificationSettings: WhatsAppNotificationSettings = {
  isEnabled: true,
  sendMode: 'manual',
  instanceId: '',
  apiToken: '',
  confirmTemplate: defaultConfirmNotificationTemplate,
  cancelTemplate: defaultCancelNotificationTemplate,
};

export const defaultStoreScheduleSettings: StoreScheduleSettings = {
  mode: 'manual',
  manualIsOpen: true,
  openTime: '10:00',
  closeTime: '02:00',
  vacationDays: [],
  customClosedMessage: 'المطعم مغلق حالياً، نتشرف باستقبال طلباتكم في أوقات العمل الرسمية 🌹',
};

// أسماء الأيام بالعربية حسب getDay()
export const WEEK_DAYS_AR = [
  { dayIndex: 0, name: 'الأحد' },
  { dayIndex: 1, name: 'الإثنين' },
  { dayIndex: 2, name: 'الثلاثاء' },
  { dayIndex: 3, name: 'الأربعاء' },
  { dayIndex: 4, name: 'الخميس' },
  { dayIndex: 5, name: 'الجمعة' },
  { dayIndex: 6, name: 'السبت' },
];

/**
 * دالة ذكية لحساب حالة المطعم اللحظية (مفتوح / مغلق / إجازة)
 * تدعم تخطي منتصف الليل مثلاً من 10:00 صباحاً إلى 02:00 بعد منتصف الليل
 */
export function computeStoreStatus(schedule: StoreScheduleSettings, now: Date = new Date()): StoreStatusResult {
  if (schedule.mode === 'manual') {
    if (schedule.manualIsOpen) {
      return {
        isOpen: true,
        reason: 'open',
        badgeText: 'مفتوح',
        detailText: 'المطعم مفتوح ويستقبل طلباتكم الآن 🟢',
      };
    } else {
      return {
        isOpen: false,
        reason: 'manual_closed',
        badgeText: 'مغلق',
        detailText: schedule.customClosedMessage || 'المطعم مغلق مؤقتاً بأمر الإدارة 🔴',
      };
    }
  }

  // الوضع التلقائي (auto)
  const currentDay = now.getDay(); // 0-6
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const [openH = 10, openM = 0] = (schedule.openTime || '10:00').split(':').map(Number);
  const [closeH = 2, closeM = 0] = (schedule.closeTime || '02:00').split(':').map(Number);

  const openTotalMinutes = openH * 60 + openM;
  const closeTotalMinutes = closeH * 60 + closeM;

  const isOvernight = closeTotalMinutes <= openTotalMinutes;

  // فحص أوقات العمل
  let isWithinHours = false;
  if (!isOvernight) {
    // دوام في نفس اليوم فقط (مثال: 09:00 إلى 22:00)
    isWithinHours = currentTotalMinutes >= openTotalMinutes && currentTotalMinutes < closeTotalMinutes;
  } else {
    // دوام ممتد بعد منتصف الليل (مثال: من 10:00 صباحاً إلى 02:00 فجر اليوم التالي)
    isWithinHours = currentTotalMinutes >= openTotalMinutes || currentTotalMinutes < closeTotalMinutes;
  }

  // تحديد اليوم المرجعي للدوام في حال كان الوقت فجراً ضمن الوردية المسائية لليوم السابق
  let effectiveShiftDay = currentDay;
  if (isOvernight && currentTotalMinutes < closeTotalMinutes) {
    // نحن بعد منتصف الليل ولكن ما زلنا ضمن دوام الأمس
    effectiveShiftDay = (currentDay + 6) % 7;
  }

  // فحص ما إذا كان اليوم إجازة أسبوعية
  const isVacation = Array.isArray(schedule.vacationDays) && schedule.vacationDays.includes(effectiveShiftDay);

  if (isVacation) {
    const dayName = WEEK_DAYS_AR.find(d => d.dayIndex === effectiveShiftDay)?.name || '';
    return {
      isOpen: false,
      reason: 'vacation',
      badgeText: 'إجازة',
      detailText: `اليوم (${dayName}) إجازة أسبوعية للمطعم 🌴`,
    };
  }

  if (!isWithinHours) {
    return {
      isOpen: false,
      reason: 'scheduled_closed',
      badgeText: 'مغلق',
      detailText: `المطعم مغلق حالياً • مواعيد العمل من ${schedule.openTime} إلى ${schedule.closeTime} ⏰`,
    };
  }

  return {
    isOpen: true,
    reason: 'open',
    badgeText: 'مفتوح',
    detailText: `المطعم مفتوح ويستقبل الطلبات حتى الساعة ${schedule.closeTime} 🟢`,
  };
}

export const defaultCartIncentiveSettings: CartIncentiveSettings = {
  isEnabled: true,
  targetAmount: 75, // أضف بـ 75 ج.م إضافية للحصول على تحلية أو كانز هدية!
  rewardText: 'تحلية أو كانز هدية',
  rewardIcon: '🎁',
  preGoalMessage: 'أضف بـ {remaining} ج.م إضافية للحصول على {reward}!',
  postGoalMessage: '🎉 مبروك! حصلت على {reward} مع طلبك!',
  includeInWhatsApp: true,
};

export const defaultCoupons: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'LOLO10',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 100,
    usedCount: 0,
    expiresAt: null,
    minOrderAmount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    note: 'كوبون ترحيبي 10% لعملاء لؤلؤة سنهور'
  },
  {
    id: 'coupon-2',
    code: 'SANHOUR15',
    discountType: 'percentage',
    discountValue: 15,
    maxUses: 50,
    usedCount: 0,
    expiresAt: null,
    minOrderAmount: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    note: 'خصم 15% للطلبات الملكية أكبر من 120 ج.م'
  }
];

export const defaultMarketingFilters: MarketingSubFilter[] = [
  { id: 'popular', name: 'الأكثر طلباً', icon: '⭐', isEnabled: true, color: 'amber' },
  { id: 'spicy', name: 'حار مشطشط', icon: '🌶️', isEnabled: true, color: 'rose' },
  { id: 'budget', name: 'أقل من 35 ج', icon: '💰', isEnabled: true, color: 'emerald' },
];

export const defaultKosharyCustomOptions: string[] = [
  'بدون مكرونة',
  'بدون أرز',
  'بدون عدس',
  'بدون بصل',
  'بدون حمص',
  'بدون صلصة',
  'بدون شطة',
];

export const defaultDishBuilderSettings: DishBuilderSettings = {
  isEnabled: true,
  bases: [
    { id: 'base-1', name: 'مكرونة طاجن فرن محمرة', price: 30 },
    { id: 'base-2', name: 'كشري اللؤلؤة الأصلي (عدس + أرز + مكرونة)', price: 30 },
    { id: 'base-3', name: 'ميكس كشري مع طاجن فرن', price: 35 },
  ],
  proteins: [
    { id: 'protein-1', name: 'لحمة مفرومة بلدي متبلة', price: 25 },
    { id: 'protein-2', name: 'شاورما فراخ فريش بالصلصة', price: 25 },
    { id: 'protein-3', name: 'كبدة إسكندراني بالثوم والفلفل', price: 20 },
    { id: 'protein-4', name: 'ميكس ثلاثي ملوكي (لحمة + فراخ + كبدة)', price: 40 },
  ],
  toppings: [
    { id: 'top-1', name: 'بصل مقرمش ذهبي', price: 10 },
    { id: 'top-2', name: 'عيش توست محمص', price: 10 },
    { id: 'top-3', name: 'صلصة طماطم مسبكة زيادة', price: 10 },
    { id: 'top-4', name: 'دقة بالخل والثوم والليمون', price: 5 },
    { id: 'top-5', name: 'حمص شام بلدي مسلوق', price: 10 },
  ],
};

interface MenuStore {
  items: MenuItem[];
  categories: Category[];
  marketingFilters: MarketingSubFilter[];
  heroFeaturedItemId: string;
  heroFeaturedItemIds: string[];
  heroBadgeText: string;
  dishBuilderSettings: DishBuilderSettings;
  kosharyCustomOptions: string[];
  customBaselineItems?: MenuItem[];
  customBaselineCategories?: Category[];
  customBaselineMarketingFilters?: MarketingSubFilter[];
  customBaselineHeroFeaturedItemId?: string;
  customBaselineHeroFeaturedItemIds?: string[];
  customBaselineHeroBadgeText?: string;
  customBaselineDishBuilderSettings?: DishBuilderSettings;
  customBaselineKosharyCustomOptions?: string[];
  addKosharyCustomOption: (option: string) => void;
  updateKosharyCustomOption: (index: number, newOption: string) => void;
  deleteKosharyCustomOption: (index: number) => void;
  setKosharyCustomOptions: (options: string[]) => void;
  updateItemImage: (itemId: string, newImageUrl: string) => void;
  updateItem: (itemId: string, updates: Partial<MenuItem>) => void;
  addItem: (item: MenuItem) => void;
  deleteItem: (itemId: string) => void;
  reorderCategoryItems: (categoryId: string, orderedItemIds: string[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;
  addMarketingFilter: (filter: MarketingSubFilter) => void;
  updateMarketingFilter: (id: string, updates: Partial<MarketingSubFilter>) => void;
  deleteMarketingFilter: (id: string) => void;
  toggleMarketingFilter: (id: string) => void;
  setHeroFeaturedDish: (itemId: string, badgeText: string) => void;
  setHeroFeaturedDishes: (itemIds: string[], badgeText: string) => void;
  toggleDishBuilderEnabled: () => void;
  setDishBuilderSettings: (settings: DishBuilderSettings) => void;
  addDishBuilderItem: (type: 'bases' | 'proteins' | 'toppings', item: DishBuilderOption) => void;
  updateDishBuilderItem: (type: 'bases' | 'proteins' | 'toppings', id: string, updates: Partial<DishBuilderOption>) => void;
  deleteDishBuilderItem: (type: 'bases' | 'proteins' | 'toppings', id: string) => void;
  moveDishBuilderItem: (type: 'bases' | 'proteins' | 'toppings', id: string, direction: 'up' | 'down') => void;
  reorderDishBuilderItemToPosition: (type: 'bases' | 'proteins' | 'toppings', id: string, newPosition: number) => void;
  isWalletPaymentEnabled: boolean;
  isInstapayPaymentEnabled: boolean;
  walletPhoneNumber: string;
  walletAccountName: string;
  instapayHandle: string;
  instapayLink: string;
  ordersWhatsappNumber: string;
  restaurantPhoneNumber: string;
  toggleWalletPayment: (enabled?: boolean) => void;
  toggleInstapayPayment: (enabled?: boolean) => void;
  setWalletPhoneNumber: (phone: string) => void;
  setWalletAccountName: (name: string) => void;
  setInstapayHandle: (handle: string) => void;
  setInstapayLink: (link: string) => void;
  setOrdersWhatsappNumber: (phone: string) => void;
  setRestaurantPhoneNumber: (phone: string) => void;
  isCouponsEnabled: boolean;
  coupons: Coupon[];
  toggleCouponsEnabled: (enabled?: boolean) => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'usedCount'>) => Coupon;
  updateCoupon: (id: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponActive: (id: string) => void;
  incrementCouponUsage: (code: string) => void;
  cartIncentiveSettings: CartIncentiveSettings;
  toggleCartIncentiveEnabled: (enabled?: boolean) => void;
  updateCartIncentiveSettings: (settings: Partial<CartIncentiveSettings>) => void;
  deliveryZones: DeliveryZone[];
  isMinOrderEnabled: boolean;
  toggleMinOrderEnabled: (enabled?: boolean) => void;
  addDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => DeliveryZone;
  updateDeliveryZone: (id: string, updates: Partial<DeliveryZone>) => void;
  deleteDeliveryZone: (id: string) => void;
  resetDeliveryZones: () => void;
  storeScheduleSettings: StoreScheduleSettings;
  updateStoreScheduleSettings: (settings: Partial<StoreScheduleSettings>) => void;
  toggleStoreManualStatus: (isOpen?: boolean) => void;
  saveAsNewDefault: () => void;
  resetToDefault: () => void;
  resetToFactoryOriginal: () => void;
  monitorPassword?: string;
  setMonitorPassword: (password: string) => void;
  applySecretsInMemory: (secrets: { monitorPassword?: string; instanceId?: string; apiToken?: string }) => void;
  clearSecretsFromMemory: () => void;
  whatsappNotificationSettings: WhatsAppNotificationSettings;
  updateWhatsAppNotificationSettings: (settings: Partial<WhatsAppNotificationSettings>) => void;
  toggleWhatsAppNotificationEnabled: (enabled?: boolean) => void;
  resetWhatsAppNotificationSettings: () => void;
  isServerSyncing: boolean;
  serverSyncError: string | null;
  lastServerSyncTime: string | null;
  syncWithServer: () => Promise<void>;
  saveToServer: () => Promise<{ success: boolean; error?: string }>;
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      isServerSyncing: false,
      serverSyncError: null,
      lastServerSyncTime: null,
      items: defaultMenuItems,
      categories: defaultCategories,
      marketingFilters: defaultMarketingFilters,
      heroFeaturedItemId: 'box-special',
      heroFeaturedItemIds: ['box-special', 'tagine-royal-mix', 'tagine-meat'],
      heroBadgeText: 'جاهز للطلب فوراً 🚀',
      dishBuilderSettings: defaultDishBuilderSettings,
      kosharyCustomOptions: defaultKosharyCustomOptions,
      isWalletPaymentEnabled: false,
      isInstapayPaymentEnabled: false,
      walletPhoneNumber: restaurantInfo.cashWalletNumber,
      walletAccountName: restaurantInfo.cashWalletName,
      instapayHandle: restaurantInfo.instapayHandle,
      instapayLink: restaurantInfo.instapayLink,
      ordersWhatsappNumber: restaurantInfo.whatsapp,
      restaurantPhoneNumber: restaurantInfo.phone,
      monitorPassword: '',
      setMonitorPassword: (password: string) => {
        set({ monitorPassword: password.trim() });
        get().saveToServer();
      },
      applySecretsInMemory: (secrets) => {
        set({
          monitorPassword: (secrets.monitorPassword || '').trim(),
          whatsappNotificationSettings: {
            ...get().whatsappNotificationSettings,
            instanceId: (secrets.instanceId || '').trim(),
            apiToken: (secrets.apiToken || '').trim(),
          },
        });
      },
      clearSecretsFromMemory: () => {
        set({
          monitorPassword: '',
          whatsappNotificationSettings: {
            ...get().whatsappNotificationSettings,
            instanceId: '',
            apiToken: '',
          },
        });
      },
      whatsappNotificationSettings: defaultWhatsAppNotificationSettings,
      toggleWhatsAppNotificationEnabled: (enabled) => {
        set(state => ({
          whatsappNotificationSettings: {
            ...state.whatsappNotificationSettings,
            isEnabled: typeof enabled === 'boolean' ? enabled : !state.whatsappNotificationSettings.isEnabled
          }
        }));
        get().saveToServer();
      },
      updateWhatsAppNotificationSettings: (settings) => {
        set(state => ({
          whatsappNotificationSettings: {
            ...state.whatsappNotificationSettings,
            ...settings
          }
        }));
        get().saveToServer();
      },
      resetWhatsAppNotificationSettings: () => {
        set({
          whatsappNotificationSettings: defaultWhatsAppNotificationSettings
        });
        get().saveToServer();
      },
      toggleWalletPayment: (enabled) => set(state => ({
        isWalletPaymentEnabled: typeof enabled === 'boolean' ? enabled : !state.isWalletPaymentEnabled
      })),
      toggleInstapayPayment: (enabled) => set(state => ({
        isInstapayPaymentEnabled: typeof enabled === 'boolean' ? enabled : !state.isInstapayPaymentEnabled
      })),
      setWalletPhoneNumber: (phone) => set({ walletPhoneNumber: phone }),
      setWalletAccountName: (name) => set({ walletAccountName: name }),
      setInstapayHandle: (handle) => set({ instapayHandle: handle }),
      setInstapayLink: (link) => set({ instapayLink: link }),
      setOrdersWhatsappNumber: (phone) => set({ ordersWhatsappNumber: phone }),
      setRestaurantPhoneNumber: (phone) => set({ restaurantPhoneNumber: phone }),
      isCouponsEnabled: true,
      coupons: defaultCoupons,
      toggleCouponsEnabled: (enabled) => set(state => ({
        isCouponsEnabled: typeof enabled === 'boolean' ? enabled : !state.isCouponsEnabled
      })),
      addCoupon: (newCouponData) => {
        const cleanCode = newCouponData.code.trim().toUpperCase();
        const newCoupon: Coupon = {
          ...newCouponData,
          id: `coupon-${Date.now()}`,
          code: cleanCode,
          usedCount: 0,
          createdAt: new Date().toISOString()
        };
        set(state => ({ coupons: [newCoupon, ...state.coupons] }));
        return newCoupon;
      },
      updateCoupon: (id, updates) => {
        set(state => ({
          coupons: state.coupons.map(c => {
            if (c.id === id) {
              const updated = { ...c, ...updates };
              if (updates.code) updated.code = updates.code.trim().toUpperCase();
              return updated;
            }
            return c;
          })
        }));
      },
      deleteCoupon: (id) => {
        set(state => ({
          coupons: state.coupons.filter(c => c.id !== id)
        }));
      },
      toggleCouponActive: (id) => {
        set(state => ({
          coupons: state.coupons.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c)
        }));
      },
      incrementCouponUsage: (code) => {
        const cleanCode = code.trim().toUpperCase();
        set(state => ({
          coupons: state.coupons.map(c => {
            if (c.code.toUpperCase() === cleanCode) {
              return { ...c, usedCount: (c.usedCount || 0) + 1 };
            }
            return c;
          })
        }));
      },
      cartIncentiveSettings: defaultCartIncentiveSettings,
      toggleCartIncentiveEnabled: (enabled) => {
        set(state => ({
          cartIncentiveSettings: {
            ...state.cartIncentiveSettings,
            isEnabled: enabled !== undefined ? enabled : !state.cartIncentiveSettings.isEnabled
          }
        }));
      },
      updateCartIncentiveSettings: (updates) => {
        set(state => ({
          cartIncentiveSettings: {
            ...state.cartIncentiveSettings,
            ...updates
          }
        }));
      },
      deliveryZones: defaultDeliveryZones,
      isMinOrderEnabled: true,
      toggleMinOrderEnabled: (enabled) => {
        set(state => ({
          isMinOrderEnabled: enabled !== undefined ? enabled : !state.isMinOrderEnabled
        }));
      },
      addDeliveryZone: (zone) => {
        const newZone: DeliveryZone = {
          ...zone,
          id: `zone-${Date.now()}`
        };
        set(state => ({ deliveryZones: [...state.deliveryZones, newZone] }));
        return newZone;
      },
      updateDeliveryZone: (id, updates) => {
        set(state => ({
          deliveryZones: state.deliveryZones.map(z => z.id === id ? { ...z, ...updates } : z)
        }));
      },
      deleteDeliveryZone: (id) => {
        set(state => ({
          deliveryZones: state.deliveryZones.filter(z => z.id !== id)
        }));
      },
      resetDeliveryZones: () => {
        set({ deliveryZones: defaultDeliveryZones });
      },
      storeScheduleSettings: defaultStoreScheduleSettings,
      updateStoreScheduleSettings: (updates) => {
        set(state => ({
          storeScheduleSettings: {
            ...state.storeScheduleSettings,
            ...updates
          }
        }));
      },
      toggleStoreManualStatus: (isOpen) => {
        set(state => ({
          storeScheduleSettings: {
            ...state.storeScheduleSettings,
            manualIsOpen: isOpen !== undefined ? isOpen : !state.storeScheduleSettings.manualIsOpen
          }
        }));
      },
      customBaselineItems: undefined,
      customBaselineCategories: undefined,
      customBaselineMarketingFilters: undefined,
      customBaselineHeroFeaturedItemId: undefined,
      customBaselineHeroFeaturedItemIds: undefined,
      customBaselineHeroBadgeText: undefined,
      customBaselineDishBuilderSettings: undefined,
      customBaselineKosharyCustomOptions: undefined,
      addKosharyCustomOption: (option) => {
        if (!option.trim()) return;
        set({ kosharyCustomOptions: [...get().kosharyCustomOptions, option.trim()] });
      },
      updateKosharyCustomOption: (index, newOption) => {
        if (!newOption.trim()) return;
        const updated = [...get().kosharyCustomOptions];
        updated[index] = newOption.trim();
        set({ kosharyCustomOptions: updated });
      },
      deleteKosharyCustomOption: (index) => {
        const updated = get().kosharyCustomOptions.filter((_, i) => i !== index);
        set({ kosharyCustomOptions: updated });
      },
      setKosharyCustomOptions: (options) => {
        set({ kosharyCustomOptions: options });
      },
      updateItemImage: (itemId, newImageUrl) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, imageUrl: newImageUrl } : item
          ),
        });
      },
      updateItem: (itemId, updates) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        });
      },
      addItem: (item) => {
        set({ items: [item, ...get().items] });
      },
      deleteItem: (itemId) => {
        set({ items: get().items.filter((i) => i.id !== itemId) });
      },
      reorderCategoryItems: (categoryId, orderedItemIds) => {
        const orderMap = new Map(orderedItemIds.map((id, index) => [id, index + 1]));
        set({
          items: get().items.map((item) => {
            if (item.categoryId === categoryId && orderMap.has(item.id)) {
              return { ...item, displayOrder: orderMap.get(item.id) };
            }
            return item;
          }),
        });
      },
      addCategory: (category) => {
        set({ categories: [...get().categories, category] });
      },
      updateCategory: (categoryId, updates) => {
        set({
          categories: get().categories.map((cat) =>
            cat.id === categoryId ? { ...cat, ...updates } : cat
          ),
        });
      },
      deleteCategory: (categoryId) => {
        set({
          categories: get().categories.filter((cat) => cat.id !== categoryId),
          items: get().items.filter((item) => item.categoryId !== categoryId),
        });
      },
      addMarketingFilter: (filter) => {
        set({ marketingFilters: [...get().marketingFilters, filter] });
      },
      updateMarketingFilter: (id, updates) => {
        set({
          marketingFilters: get().marketingFilters.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        });
      },
      deleteMarketingFilter: (id) => {
        set({
          marketingFilters: get().marketingFilters.filter((f) => f.id !== id),
        });
      },
      toggleMarketingFilter: (id) => {
        set({
          marketingFilters: get().marketingFilters.map((f) =>
            f.id === id ? { ...f, isEnabled: !f.isEnabled } : f
          ),
        });
      },
      setHeroFeaturedDish: (itemId, badgeText) => {
        set({
          heroFeaturedItemId: itemId,
          heroFeaturedItemIds: [itemId],
          heroBadgeText: badgeText,
        });
      },
      setHeroFeaturedDishes: (itemIds, badgeText) => {
        set({
          heroFeaturedItemIds: itemIds,
          heroFeaturedItemId: itemIds[0] || 'box-special',
          heroBadgeText: badgeText,
        });
      },
      toggleDishBuilderEnabled: () => {
        set({
          dishBuilderSettings: {
            ...get().dishBuilderSettings,
            isEnabled: !get().dishBuilderSettings.isEnabled,
          },
        });
      },
      setDishBuilderSettings: (settings) => {
        set({ dishBuilderSettings: settings });
      },
      addDishBuilderItem: (type, item) => {
        set({
          dishBuilderSettings: {
            ...get().dishBuilderSettings,
            [type]: [...get().dishBuilderSettings[type], item],
          },
        });
      },
      updateDishBuilderItem: (type, id, updates) => {
        set({
          dishBuilderSettings: {
            ...get().dishBuilderSettings,
            [type]: get().dishBuilderSettings[type].map((i) =>
              i.id === id ? { ...i, ...updates } : i
            ),
          },
        });
      },
      deleteDishBuilderItem: (type, id) => {
        set({
          dishBuilderSettings: {
            ...get().dishBuilderSettings,
            [type]: get().dishBuilderSettings[type].filter((i) => i.id !== id),
          },
        });
      },
      moveDishBuilderItem: (type, id, direction) => {
        const currentList = [...(get().dishBuilderSettings[type] || [])];
        const currentIndex = currentList.findIndex((i) => i.id === id);
        if (currentIndex === -1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= currentList.length) return;
        const [moved] = currentList.splice(currentIndex, 1);
        currentList.splice(targetIndex, 0, moved);
        set({
          dishBuilderSettings: {
            ...get().dishBuilderSettings,
            [type]: currentList,
          },
        });
      },
      reorderDishBuilderItemToPosition: (type, id, newPosition) => {
        const currentList = [...(get().dishBuilderSettings[type] || [])];
        const currentIndex = currentList.findIndex((i) => i.id === id);
        if (currentIndex === -1) return;
        const [moved] = currentList.splice(currentIndex, 1);
        const targetIndex = Math.max(0, Math.min(newPosition - 1, currentList.length));
        currentList.splice(targetIndex, 0, moved);
        set({
          dishBuilderSettings: {
            ...get().dishBuilderSettings,
            [type]: currentList,
          },
        });
      },
      saveAsNewDefault: () => {
        const currentItems = get().items;
        const currentCategories = get().categories;
        const currentFilters = get().marketingFilters;
        set({
          customBaselineItems: JSON.parse(JSON.stringify(currentItems)),
          customBaselineCategories: JSON.parse(JSON.stringify(currentCategories)),
          customBaselineMarketingFilters: JSON.parse(JSON.stringify(currentFilters)),
          customBaselineHeroFeaturedItemId: get().heroFeaturedItemId,
          customBaselineHeroFeaturedItemIds: JSON.parse(JSON.stringify(get().heroFeaturedItemIds)),
          customBaselineHeroBadgeText: get().heroBadgeText,
          customBaselineDishBuilderSettings: JSON.parse(JSON.stringify(get().dishBuilderSettings)),
          customBaselineKosharyCustomOptions: JSON.parse(JSON.stringify(get().kosharyCustomOptions)),
        });
        get().saveToServer();
      },
      syncWithServer: async () => {
        set({ isServerSyncing: true, serverSyncError: null });
        try {
          const remoteData = await fetchRestaurantSettingsFromDb();
          if (remoteData && remoteData.items && Array.isArray(remoteData.items) && remoteData.items.length > 0) {
            set({
              items: remoteData.items,
              categories: (remoteData.categories && remoteData.categories.length > 0) ? remoteData.categories : get().categories,
              marketingFilters: remoteData.marketingFilters || get().marketingFilters,
              dishBuilderSettings: remoteData.dishBuilderSettings || get().dishBuilderSettings,
              deliveryZones: (remoteData.deliveryZones && remoteData.deliveryZones.length > 0) ? remoteData.deliveryZones : get().deliveryZones,
              coupons: remoteData.coupons || get().coupons,
              storeScheduleSettings: remoteData.storeScheduleSettings || get().storeScheduleSettings,
              heroFeaturedItemIds: remoteData.heroFeaturedItemIds || get().heroFeaturedItemIds,
              heroFeaturedItemId: remoteData.heroFeaturedItemId || get().heroFeaturedItemId,
              heroBadgeText: remoteData.heroBadgeText || get().heroBadgeText,
              isWalletPaymentEnabled: typeof remoteData.isWalletPaymentEnabled === 'boolean' ? remoteData.isWalletPaymentEnabled : get().isWalletPaymentEnabled,
              isInstapayPaymentEnabled: typeof remoteData.isInstapayPaymentEnabled === 'boolean' ? remoteData.isInstapayPaymentEnabled : get().isInstapayPaymentEnabled,
              walletPhoneNumber: remoteData.walletPhoneNumber || get().walletPhoneNumber,
              walletAccountName: remoteData.walletAccountName || get().walletAccountName,
              instapayHandle: remoteData.instapayHandle || get().instapayHandle,
              instapayLink: typeof remoteData.instapayLink === 'string'
                ? normalizeInstapayLink(remoteData.instapayLink)
                : get().instapayLink,
              ordersWhatsappNumber: remoteData.ordersWhatsappNumber || get().ordersWhatsappNumber,
              restaurantPhoneNumber: remoteData.restaurantPhoneNumber || get().restaurantPhoneNumber,
              cartIncentiveSettings: remoteData.cartIncentiveSettings || get().cartIncentiveSettings,
              kosharyCustomOptions: remoteData.kosharyCustomOptions || get().kosharyCustomOptions,
              isCouponsEnabled: typeof remoteData.isCouponsEnabled === 'boolean' ? remoteData.isCouponsEnabled : get().isCouponsEnabled,
              isMinOrderEnabled: typeof remoteData.isMinOrderEnabled === 'boolean' ? remoteData.isMinOrderEnabled : get().isMinOrderEnabled,
              monitorPassword: get().monitorPassword || '',
              whatsappNotificationSettings: {
                ...defaultWhatsAppNotificationSettings,
                ...(get().whatsappNotificationSettings || {}),
                ...(remoteData.whatsappNotificationSettings || {}),
                instanceId: remoteData.whatsappNotificationSettings?.instanceId || get().whatsappNotificationSettings?.instanceId || '',
                apiToken: remoteData.whatsappNotificationSettings?.apiToken || get().whatsappNotificationSettings?.apiToken || '',
              },
              isServerSyncing: false,
              lastServerSyncTime: new Date().toLocaleTimeString('ar-EG'),
            });
          } else {
            set({
              isServerSyncing: false,
              lastServerSyncTime: null,
              serverSyncError: null,
            });
          }
        } catch (err: any) {
          set({ isServerSyncing: false, serverSyncError: err.message });
        }
      },
      saveToServer: async () => {
        set({ isServerSyncing: true, serverSyncError: null });
        try {
          const payload = {
            items: get().items,
            categories: get().categories,
            marketingFilters: get().marketingFilters,
            dishBuilderSettings: get().dishBuilderSettings,
            deliveryZones: get().deliveryZones,
            coupons: get().coupons,
            storeScheduleSettings: get().storeScheduleSettings,
            heroFeaturedItemIds: get().heroFeaturedItemIds,
            heroFeaturedItemId: get().heroFeaturedItemId,
            heroBadgeText: get().heroBadgeText,
            isWalletPaymentEnabled: get().isWalletPaymentEnabled,
            isInstapayPaymentEnabled: get().isInstapayPaymentEnabled,
            walletPhoneNumber: get().walletPhoneNumber,
            walletAccountName: get().walletAccountName,
            instapayHandle: get().instapayHandle,
            instapayLink: normalizeInstapayLink(get().instapayLink),
            ordersWhatsappNumber: get().ordersWhatsappNumber,
            restaurantPhoneNumber: get().restaurantPhoneNumber,
            cartIncentiveSettings: get().cartIncentiveSettings,
            kosharyCustomOptions: get().kosharyCustomOptions,
            isCouponsEnabled: get().isCouponsEnabled,
            isMinOrderEnabled: get().isMinOrderEnabled,
            monitorPassword: get().monitorPassword || '',
            whatsappNotificationSettings: get().whatsappNotificationSettings,
          };
          const res = await saveRestaurantSettingsToDb(payload);
          if (res.success) {
            set({
              isServerSyncing: false,
              lastServerSyncTime: new Date().toLocaleTimeString('ar-EG'),
            });
            return { success: true };
          } else {
            set({ isServerSyncing: false, serverSyncError: res.error || 'تعذر الحفظ في السيرفر' });
            return { success: false, error: res.error };
          }
        } catch (err: any) {
          set({ isServerSyncing: false, serverSyncError: err.message });
          return { success: false, error: err.message };
        }
      },
      resetToDefault: () => {
        const baselineItems = get().customBaselineItems;
        const baselineCategories = get().customBaselineCategories;
        const baselineFilters = get().customBaselineMarketingFilters;
        const baselineHeroItemId = get().customBaselineHeroFeaturedItemId;
        const baselineHeroItemIds = get().customBaselineHeroFeaturedItemIds;
        const baselineHeroBadge = get().customBaselineHeroBadgeText;
        const baselineDishBuilder = get().customBaselineDishBuilderSettings;
        const baselineKosharyOptions = get().customBaselineKosharyCustomOptions;
        if (baselineItems && baselineItems.length > 0) {
          set({
            items: JSON.parse(JSON.stringify(baselineItems)),
            categories: baselineCategories ? JSON.parse(JSON.stringify(baselineCategories)) : defaultCategories,
            marketingFilters: baselineFilters ? JSON.parse(JSON.stringify(baselineFilters)) : defaultMarketingFilters,
            heroFeaturedItemId: baselineHeroItemId || 'box-special',
            heroFeaturedItemIds: baselineHeroItemIds && baselineHeroItemIds.length > 0 ? JSON.parse(JSON.stringify(baselineHeroItemIds)) : ['box-special', 'tagine-royal-mix', 'tagine-meat'],
            heroBadgeText: baselineHeroBadge || 'جاهز للطلب فوراً 🚀',
            dishBuilderSettings: baselineDishBuilder ? JSON.parse(JSON.stringify(baselineDishBuilder)) : defaultDishBuilderSettings,
            kosharyCustomOptions: baselineKosharyOptions ? JSON.parse(JSON.stringify(baselineKosharyOptions)) : defaultKosharyCustomOptions,
          });
        } else {
          set({
            items: defaultMenuItems,
            categories: defaultCategories,
            marketingFilters: defaultMarketingFilters,
            heroFeaturedItemId: 'box-special',
            heroFeaturedItemIds: ['box-special', 'tagine-royal-mix', 'tagine-meat'],
            heroBadgeText: 'جاهز للطلب فوراً 🚀',
            dishBuilderSettings: defaultDishBuilderSettings,
            kosharyCustomOptions: defaultKosharyCustomOptions,
          });
        }
      },
      resetToFactoryOriginal: () => {
        set({
          items: defaultMenuItems,
          categories: defaultCategories,
          marketingFilters: defaultMarketingFilters,
          heroFeaturedItemId: 'box-special',
          heroFeaturedItemIds: ['box-special', 'tagine-royal-mix', 'tagine-meat'],
          heroBadgeText: 'جاهز للطلب فوراً 🚀',
          dishBuilderSettings: defaultDishBuilderSettings,
          kosharyCustomOptions: defaultKosharyCustomOptions,
          customBaselineItems: undefined,
          customBaselineCategories: undefined,
          customBaselineMarketingFilters: undefined,
          customBaselineHeroFeaturedItemId: undefined,
          customBaselineHeroFeaturedItemIds: undefined,
          customBaselineHeroBadgeText: undefined,
          customBaselineDishBuilderSettings: undefined,
          customBaselineKosharyCustomOptions: undefined,
        });
      },
    }),
    {
      name: 'lolat_menu_store_v3',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState: any, currentState: MenuStore) => ({
        ...currentState,
        ...(persistedState || {}),
        isWalletPaymentEnabled: typeof persistedState?.isWalletPaymentEnabled === 'boolean'
          ? persistedState.isWalletPaymentEnabled
          : false,
        isInstapayPaymentEnabled: typeof persistedState?.isInstapayPaymentEnabled === 'boolean'
          ? persistedState.isInstapayPaymentEnabled
          : false,
        walletPhoneNumber: persistedState?.walletPhoneNumber || restaurantInfo.cashWalletNumber,
        walletAccountName: persistedState?.walletAccountName || restaurantInfo.cashWalletName,
        instapayHandle: persistedState?.instapayHandle || restaurantInfo.instapayHandle,
        instapayLink: typeof persistedState?.instapayLink === 'string'
          ? normalizeInstapayLink(persistedState.instapayLink)
          : normalizeInstapayLink(restaurantInfo.instapayLink),
        ordersWhatsappNumber: persistedState?.ordersWhatsappNumber || restaurantInfo.whatsapp,
        restaurantPhoneNumber: persistedState?.restaurantPhoneNumber || restaurantInfo.phone,
        monitorPassword: '',
        whatsappNotificationSettings: persistedState?.whatsappNotificationSettings
          ? {
              ...defaultWhatsAppNotificationSettings,
              ...persistedState.whatsappNotificationSettings,
              isEnabled: typeof persistedState.whatsappNotificationSettings.isEnabled === 'boolean'
                ? persistedState.whatsappNotificationSettings.isEnabled
                : defaultWhatsAppNotificationSettings.isEnabled,
              sendMode: persistedState.whatsappNotificationSettings.sendMode === 'auto' ? 'auto' : 'manual',
              instanceId: '',
              apiToken: '',
              confirmTemplate: persistedState.whatsappNotificationSettings.confirmTemplate || defaultWhatsAppNotificationSettings.confirmTemplate,
              cancelTemplate: persistedState.whatsappNotificationSettings.cancelTemplate || defaultWhatsAppNotificationSettings.cancelTemplate,
            }
          : defaultWhatsAppNotificationSettings,
        isCouponsEnabled: typeof persistedState?.isCouponsEnabled === 'boolean'
          ? persistedState.isCouponsEnabled
          : true,
        coupons: (persistedState && Array.isArray(persistedState.coupons))
          ? persistedState.coupons
          : defaultCoupons,
        cartIncentiveSettings: persistedState?.cartIncentiveSettings
          ? {
              ...defaultCartIncentiveSettings,
              ...persistedState.cartIncentiveSettings,
              targetAmount: Number(persistedState.cartIncentiveSettings.targetAmount) || 75
            }
          : defaultCartIncentiveSettings,
        isMinOrderEnabled: typeof persistedState?.isMinOrderEnabled === 'boolean'
          ? persistedState.isMinOrderEnabled
          : true,
        deliveryZones: (persistedState && Array.isArray(persistedState.deliveryZones) && persistedState.deliveryZones.length > 0)
          ? persistedState.deliveryZones
          : defaultDeliveryZones,
        storeScheduleSettings: persistedState?.storeScheduleSettings
          ? {
              ...defaultStoreScheduleSettings,
              ...persistedState.storeScheduleSettings,
              vacationDays: Array.isArray(persistedState.storeScheduleSettings.vacationDays)
                ? persistedState.storeScheduleSettings.vacationDays
                : []
            }
          : defaultStoreScheduleSettings,
        kosharyCustomOptions: (persistedState && Array.isArray(persistedState.kosharyCustomOptions) && persistedState.kosharyCustomOptions.length > 0)
          ? persistedState.kosharyCustomOptions
          : defaultKosharyCustomOptions,
        heroFeaturedItemIds: (persistedState && Array.isArray(persistedState.heroFeaturedItemIds) && persistedState.heroFeaturedItemIds.length > 0)
          ? persistedState.heroFeaturedItemIds
          : (persistedState?.heroFeaturedItemId ? [persistedState.heroFeaturedItemId] : currentState.heroFeaturedItemIds || ['box-special', 'tagine-royal-mix', 'tagine-meat']),
        heroFeaturedItemId: persistedState?.heroFeaturedItemId || currentState.heroFeaturedItemId || 'box-special',
        heroBadgeText: persistedState?.heroBadgeText || currentState.heroBadgeText || 'جاهز للطلب فوراً 🚀',
        dishBuilderSettings: (persistedState && persistedState.dishBuilderSettings)
          ? {
              ...defaultDishBuilderSettings,
              ...persistedState.dishBuilderSettings,
              bases: (Array.isArray(persistedState.dishBuilderSettings.bases) && persistedState.dishBuilderSettings.bases.length > 0)
                ? persistedState.dishBuilderSettings.bases
                : defaultDishBuilderSettings.bases,
              proteins: (Array.isArray(persistedState.dishBuilderSettings.proteins) && persistedState.dishBuilderSettings.proteins.length > 0)
                ? persistedState.dishBuilderSettings.proteins
                : defaultDishBuilderSettings.proteins,
              toppings: (Array.isArray(persistedState.dishBuilderSettings.toppings) && persistedState.dishBuilderSettings.toppings.length > 0)
                ? persistedState.dishBuilderSettings.toppings
                : defaultDishBuilderSettings.toppings,
            }
          : defaultDishBuilderSettings,
        categories: (persistedState && Array.isArray(persistedState.categories) && persistedState.categories.length > 0)
          ? persistedState.categories.map((c: any) => {
              const updated = { ...c };
              if (c.id === 'boxes' && c.isKoshary === undefined) {
                updated.isKoshary = true;
              }
              if (c.id === 'extras' && c.isExtras === undefined) {
                updated.isExtras = true;
              }
              return updated;
            })
          : defaultCategories,
        items: (persistedState && Array.isArray(persistedState.items) && persistedState.items.length > 0)
          ? persistedState.items.map((it: any) => {
              let updated = { ...it };
              if (it.id === 'box-big' && it.imageUrl?.includes('unsplash.com')) {
                updated.imageUrl = '/menu/koshary-box.jpg';
              }
              if (it.id === 'box-double' && it.imageUrl?.includes('unsplash.com')) {
                updated.imageUrl = '/menu/koshary-box.jpg';
              }
              if (updated.displayOrder === undefined) {
                const defaultItem = defaultMenuItems.find(d => d.id === it.id);
                updated.displayOrder = defaultItem?.displayOrder || 1;
              }
              return updated;
            })
          : currentState.items,
        marketingFilters: (persistedState && Array.isArray(persistedState.marketingFilters) && persistedState.marketingFilters.length > 0)
          ? persistedState.marketingFilters.map((f: any) => {
              // Ensure real emoji symbols as requested
              if (f.id === 'spicy' && (f.icon === 'Flame' || f.icon === 'Pepper' || !f.icon)) return { ...f, icon: '🌶️' };
              if (f.id === 'popular' && (f.icon === 'Star' || !f.icon)) return { ...f, icon: '⭐' };
              if (f.id === 'budget' && (f.icon === 'Coins' || f.icon === 'DollarSign' || !f.icon)) return { ...f, icon: '💰' };
              return f;
            })
          : defaultMarketingFilters,
      }),
      partialize: (state) => ({
        ...state,
        monitorPassword: '',
        whatsappNotificationSettings: {
          ...state.whatsappNotificationSettings,
          instanceId: '',
          apiToken: '',
        },
      }),
      onRehydrateStorage: () => () => {
        if (typeof window === 'undefined') return;
        try {
          const raw = localStorage.getItem('lolat_menu_store_v3');
          if (!raw) return;
          const parsed = JSON.parse(raw);
          const stored = parsed?.state;
          if (!stored || typeof stored !== 'object') return;
          stored.monitorPassword = '';
          if (stored.whatsappNotificationSettings && typeof stored.whatsappNotificationSettings === 'object') {
            stored.whatsappNotificationSettings.instanceId = '';
            stored.whatsappNotificationSettings.apiToken = '';
          }
          localStorage.setItem('lolat_menu_store_v3', JSON.stringify(parsed));
        } catch {
          // ignore broken local cache
        }
      },
    }
  )
);
