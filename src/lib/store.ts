import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, MenuItem, OrderType, PaymentMethod, CustomerInfo, CustomDishDetails } from '@/types';
import { deliveryZones } from '@/data/mockData';
import { useMenuStore } from './menuStore';
import { resolveCartLineUnitPrice } from './orderPricing';

interface CartStore {
  items: CartItem[];
  orderType: OrderType;
  selectedZoneId: string;
  paymentMethod: PaymentMethod;
  appliedCoupon: string | null;
  discountPercent: number;
  discountFixedAmount?: number;
  isCartOpen: boolean;

  // Actions
  addItem: (item: MenuItem, quantity?: number, selectedSize?: string, notes?: string, itemNotes?: string[], customDishDetails?: CustomDishDetails) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  addItemNote: (cartItemId: string, note: string) => void;
  removeItemNote: (cartItemId: string, noteIndex: number) => void;
  updateItemNotes: (cartItemId: string, notes: string, itemNotes?: string[]) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType) => void;
  setSelectedZoneId: (zoneId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  refreshPricesFromMenu: () => { pricesChanged: boolean; unavailableCount: number; couponRemoved: boolean };

  // Calculations
  getItemsCount: () => number;
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'delivery',
      selectedZoneId: deliveryZones[0].id,
      paymentMethod: 'cash',
      appliedCoupon: null,
      discountPercent: 0,
      discountFixedAmount: 0,
      isCartOpen: false,

      addItem: (item, quantity = 1, selectedSize, notes, itemNotes, customDishDetails) => {
        const currentItems = get().items;
        const itemPrice = selectedSize && item.sizes
          ? item.sizes.find(s => s.name === selectedSize)?.price || item.price
          : item.price;

        const existingIndex = currentItems.findIndex(
          i => i.menuItemId === item.id && i.selectedSize === selectedSize && i.notes === notes
        );

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
            price: itemPrice,
            unavailable: false,
          };
          set({ items: updated });
        } else {
          const newItem: CartItem = {
            id: `${item.id}-${selectedSize || 'default'}-${Date.now()}`,
            menuItemId: item.id,
            categoryId: item.categoryId,
            name: selectedSize ? `${item.name} (${selectedSize})` : item.name,
            price: itemPrice,
            quantity,
            imageUrl: item.imageUrl,
            selectedSize,
            notes,
            itemNotes: itemNotes && itemNotes.length > 0
              ? itemNotes
              : (notes ? [notes] : []),
            customDishDetails
          };
          set({ items: [...currentItems, newItem] });
        }
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter(i => i.id !== cartItemId) });
      },

      updateQuantity: (cartItemId, delta) => {
        const updated = get().items
          .map(item => {
            if (item.id === cartItemId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];
        set({ items: updated });
      },

      addItemNote: (cartItemId, note) => {
        const trimmed = note.trim();
        if (!trimmed) return;
        const updated = get().items.map(item => {
          if (item.id === cartItemId) {
            const currentNotes = item.itemNotes && item.itemNotes.length > 0
              ? item.itemNotes
              : (item.notes ? item.notes.split(' • ').map(s => s.trim()).filter(Boolean) : []);
            if (currentNotes.includes(trimmed)) return item;
            const newNotes = [...currentNotes, trimmed];
            return {
              ...item,
              itemNotes: newNotes,
              notes: newNotes.join(' • ')
            };
          }
          return item;
        });
        set({ items: updated });
      },

      removeItemNote: (cartItemId, noteIndex) => {
        const updated = get().items.map(item => {
          if (item.id === cartItemId) {
            const currentNotes = item.itemNotes && item.itemNotes.length > 0
              ? item.itemNotes
              : (item.notes ? item.notes.split(' • ').map(s => s.trim()).filter(Boolean) : []);
            const newNotes = currentNotes.filter((_, idx) => idx !== noteIndex);
            return {
              ...item,
              itemNotes: newNotes,
              notes: newNotes.length > 0 ? newNotes.join(' • ') : undefined
            };
          }
          return item;
        });
        set({ items: updated });
      },

      updateItemNotes: (cartItemId, notes, itemNotes) => {
        const updated = get().items.map(item => {
          if (item.id === cartItemId) {
            return {
              ...item,
              notes,
              itemNotes: itemNotes || (notes ? notes.split(' • ').map(s => s.trim()).filter(Boolean) : [])
            };
          }
          return item;
        });
        set({ items: updated });
      },

      clearCart: () => set({ items: [], appliedCoupon: null, discountPercent: 0 }),

      setOrderType: (type) => set({ orderType: type }),

      setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      applyCoupon: (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) {
          return { success: false, message: 'يرجى كتابة كود الكوبون' };
        }

        const menuStore = useMenuStore.getState();
        if (!menuStore.isCouponsEnabled) {
          return { success: false, message: 'عذراً، نظام الكوبونات غير مفعّل حالياً' };
        }

        const coupon = (menuStore.coupons || []).find(
          c => c.code.trim().toUpperCase() === cleanCode
        );

        if (!coupon) {
          return { success: false, message: 'كود الكوبون غير صحيح أو غير موجود' };
        }

        if (!coupon.isActive) {
          return { success: false, message: 'هذا الكوبون غير مفعّل حالياً من إدارة المطعم' };
        }

        // Check expiration date & time if specified
        if (coupon.expiresAt) {
          const expireTime = new Date(coupon.expiresAt).getTime();
          if (!isNaN(expireTime) && Date.now() > expireTime) {
            const dateStr = new Date(coupon.expiresAt).toLocaleDateString('ar-EG');
            return { success: false, message: `عذراً، هذا الكوبون انتهت صلاحيته بتاريخ (${dateStr})` };
          }
        }

        // Check max uses if specified
        if (typeof coupon.maxUses === 'number' && coupon.maxUses > 0) {
          if ((coupon.usedCount || 0) >= coupon.maxUses) {
            return { success: false, message: 'عذراً، تم استنفاد الحد الأقصى المتاح لاستخدام هذا الكوبون' };
          }
        }

        // Check minimum order amount if specified
        const subtotal = get().getSubtotal();
        if (coupon.minOrderAmount && coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
          return {
            success: false,
            message: `الحد الأدنى لتطبيق هذا الكوبون هو ${coupon.minOrderAmount} ج.م (طلبك الحالي: ${subtotal} ج.م)`
          };
        }

        // Apply discount!
        if (coupon.discountType === 'fixed') {
          set({
            appliedCoupon: coupon.code,
            discountPercent: 0,
            discountFixedAmount: coupon.discountValue
          });
          return {
            success: true,
            message: `تم تطبيق خصم بقيمة ${coupon.discountValue} ج.م بنجاح! 🎉`
          };
        } else {
          set({
            appliedCoupon: coupon.code,
            discountPercent: coupon.discountValue,
            discountFixedAmount: 0
          });
          return {
            success: true,
            message: `تم تطبيق خصم بنسبة ${coupon.discountValue}% بنجاح! 🎉`
          };
        }
      },

      removeCoupon: () => set({ appliedCoupon: null, discountPercent: 0, discountFixedAmount: 0 }),

      setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),

      refreshPricesFromMenu: () => {
        const menu = useMenuStore.getState();
        const settings = {
          items: menu.items,
          dishBuilderSettings: menu.dishBuilderSettings,
        };
        let pricesChanged = false;
        let unavailableCount = 0;
        const next = get().items.map((item) => {
          const priced = resolveCartLineUnitPrice({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            customDishDetails: item.customDishDetails,
            extras: item.extras,
          }, settings);
          if (!priced.ok) {
            unavailableCount += 1;
            if (!item.unavailable) pricesChanged = true;
            return { ...item, unavailable: true };
          }
          const menuItem = (menu.items || []).find((entry) => entry.id === item.menuItemId);
          const nextName = menuItem
            ? (item.selectedSize ? `${menuItem.name} (${item.selectedSize})` : menuItem.name)
            : item.name;
          if (item.price !== priced.price || item.unavailable || item.name !== nextName) {
            pricesChanged = true;
          }
          return {
            ...item,
            price: priced.price,
            name: nextName,
            imageUrl: menuItem?.imageUrl || item.imageUrl,
            unavailable: false,
          };
        });
        if (pricesChanged) {
          set({ items: next });
        }

        let couponRemoved = false;
        const code = get().appliedCoupon;
        if (code) {
          const result = get().applyCoupon(code);
          if (!result.success) {
            get().removeCoupon();
            couponRemoved = true;
          }
        }

        return { pricesChanged, unavailableCount, couponRemoved };
      },

      getItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items
          .filter((item) => !item.unavailable)
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDeliveryFee: () => {
        if (get().orderType !== 'delivery') return 0;
        const currentZones = useMenuStore.getState().deliveryZones || deliveryZones;
        const zone = currentZones.find(z => z.id === get().selectedZoneId);
        const fee = zone ? zone.fee : (currentZones[0]?.fee || 15);
        return Math.max(0, Math.round(Number(fee) || 0));
      },

      getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        const percent = get().discountPercent || 0;
        const fixed = get().discountFixedAmount || 0;
        const percentAmount = Math.round((subtotal * percent) / 100);
        const fixedAmount = Math.round(Number(fixed) || 0);
        return Math.min(subtotal, percentAmount + fixedAmount);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const deliveryFee = get().getDeliveryFee();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal + deliveryFee - discount);
      }
    }),
    {
      name: 'loloat_sanhour_cart',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

interface CustomerStore {
  customer: CustomerInfo;
  setCustomer: (info: Partial<CustomerInfo>) => void;
  resetCustomer: () => void;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customer: {
        name: '',
        phone: '',
        zoneId: deliveryZones[0].id,
        address: '',
        buildingFloorNotes: '',
        orderNotes: ''
      },
      setCustomer: (info) =>
        set({
          customer: { ...get().customer, ...info }
        }),
      resetCustomer: () =>
        set({
          customer: {
            name: '',
            phone: '',
            zoneId: deliveryZones[0].id,
            address: '',
            buildingFloorNotes: '',
            orderNotes: ''
          }
        })
    }),
    {
      name: 'loloat_sanhour_customer_crm',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
