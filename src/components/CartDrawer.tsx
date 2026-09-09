'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Bike,
  Store,
  MapPin,
  Phone,
  User,
  Copy,
  Check,
  CreditCard,
  Zap,
  Sparkles,
  ArrowRight,
  Gift,
  Edit3,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCartStore, useCustomerStore } from '@/lib/store';
import { useMenuStore, defaultKosharyCustomOptions, computeStoreStatus, defaultStoreScheduleSettings } from '@/lib/menuStore';
import { deliveryZones, restaurantInfo, smartUpsellItems } from '@/data/mockData';
import { generateWhatsAppMessage, openWhatsAppChat } from '@/lib/whatsapp';
import { saveOrderToSupabase } from '@/lib/supabase';
import { sounds } from '@/lib/sound';
import { OrderType, PaymentMethod, CartItem } from '@/types';

export const CartDrawer: React.FC = () => {
  const {
    items,
    orderType,
    selectedZoneId,
    paymentMethod,
    appliedCoupon,
    isCartOpen,
    removeItem,
    updateQuantity,
    addItemNote,
    removeItemNote,
    clearCart,
    setOrderType,
    setSelectedZoneId,
    setPaymentMethod,
    applyCoupon,
    removeCoupon,
    setIsCartOpen,
    getItemsCount,
    getSubtotal,
    getDeliveryFee,
    getDiscountAmount,
    getTotal,
    addItem
  } = useCartStore();

  const {
    items: menuStoreItems,
    categories,
    kosharyCustomOptions,
    isWalletPaymentEnabled = false,
    isInstapayPaymentEnabled = false,
    walletPhoneNumber = restaurantInfo.cashWalletNumber,
    instapayHandle = restaurantInfo.instapayHandle,
    isCouponsEnabled = true,
    cartIncentiveSettings,
    isMinOrderEnabled = true,
    deliveryZones: menuDeliveryZones,
    storeScheduleSettings = defaultStoreScheduleSettings,
  } = useMenuStore();
  const activeKosharyPresets = (kosharyCustomOptions && kosharyCustomOptions.length > 0)
    ? kosharyCustomOptions
    : defaultKosharyCustomOptions;

  const currentStoreStatus = computeStoreStatus(storeScheduleSettings);

  const { customer, setCustomer } = useCustomerStore();

  // Reset dine_in if saved in local storage from before
  useEffect(() => {
    if ((orderType as string) === 'dine_in') {
      setOrderType('delivery');
    }
  }, [orderType, setOrderType]);

  // Auto fallback to 'cash' if the selected payment method is disabled
  useEffect(() => {
    if (paymentMethod === 'vodafone_cash' && !isWalletPaymentEnabled) {
      setPaymentMethod('cash');
    } else if (paymentMethod === 'instapay' && !isInstapayPaymentEnabled) {
      setPaymentMethod('cash');
    }
  }, [paymentMethod, isWalletPaymentEnabled, isInstapayPaymentEnabled, setPaymentMethod]);

  // If coupons disabled from admin, clear any applied coupon
  useEffect(() => {
    if (!isCouponsEnabled && appliedCoupon) {
      removeCoupon();
    }
  }, [isCouponsEnabled, appliedCoupon, removeCoupon]);

  // Notes state for cart items
  const [openNotesItemId, setOpenNotesItemId] = useState<string | null>(null);
  const [itemPresetSelection, setItemPresetSelection] = useState<Record<string, string>>({});
  const [itemCustomNote, setItemCustomNote] = useState<Record<string, string>>({});

  const isKosharyItem = (cartItem: CartItem) => {
    const menuItem = menuStoreItems?.find(m => m.id === cartItem.menuItemId);
    const catId = cartItem.categoryId || menuItem?.categoryId;
    const category = categories?.find(c => c.id === catId);
    
    // Explicit toggle check: If category has isKoshary set, obey it!
    if (category && typeof category.isKoshary === 'boolean') {
      return category.isKoshary;
    }

    // Default fallback: only 'boxes' (العلب الملكية) category if not explicitly set
    return catId === 'boxes';
  };

  // Find all items belonging to categories classified as Extras (isExtras: true or id: 'extras')
  const extrasCategoryIds = categories
    ? categories.filter(c => c.isExtras || c.id === 'extras').map(c => c.id)
    : ['extras'];
  const realExtrasItems = (menuStoreItems || []).filter(
    item => extrasCategoryIds.includes(item.categoryId) && item.isAvailable !== false
  );
  // Fallback to smartUpsellItems only if no items found in extras categories, ensuring no deleted or disabled items appear
  const availableItemsMap = new Set((menuStoreItems || []).filter(m => m.isAvailable !== false).map(m => m.id));
  const displayedUpsellItems = (realExtrasItems.length > 0 ? realExtrasItems : smartUpsellItems).filter(
    item => availableItemsMap.has(item.id) && item.isAvailable !== false
  );

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedInstapay, setCopiedInstapay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCartOpen) return null;

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const discount = getDiscountAmount();
  const total = getTotal();
  const totalItems = getItemsCount();
  const activeDeliveryZones = (menuDeliveryZones && menuDeliveryZones.length > 0)
    ? menuDeliveryZones
    : deliveryZones;
  const selectedZone = activeDeliveryZones.find(z => z.id === selectedZoneId) || activeDeliveryZones[0];

  // Smart Cart Gift Incentive (dynamic from admin settings)
  const incentiveTarget = Number(cartIncentiveSettings?.targetAmount) || 75;
  const isGoalReached = subtotal >= incentiveTarget;
  const remainingAmount = Math.max(0, incentiveTarget - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / incentiveTarget) * 100));
  const rewardText = cartIncentiveSettings?.rewardText || 'تحلية أو كانز هدية';
  const preGoalMessage = (cartIncentiveSettings?.preGoalMessage || 'أضف بـ {remaining} ج.م إضافية للحصول على {reward}!')
    .replace('{remaining}', String(remainingAmount))
    .replace('{reward}', rewardText);
  const postGoalMessage = (cartIncentiveSettings?.postGoalMessage || '🎉 مبروك! حصلت على {reward} مع طلبك!')
    .replace('{remaining}', '0')
    .replace('{reward}', rewardText);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    const res = useCartStore.getState().applyCoupon(couponInput);
    setCouponMessage({ text: res.message, isError: !res.success });
    if (res.success) {
      sounds.playSuccessChime();
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#f59e0b', '#ffffff']
      });
      setCouponInput('');
    } else {
      sounds.playAddChime();
    }
  };

  const handleCopy = (text: string, type: 'wallet' | 'instapay') => {
    navigator.clipboard.writeText(text);
    if (type === 'wallet') {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } else {
      setCopiedInstapay(true);
      setTimeout(() => setCopiedInstapay(false), 2000);
    }
  };

  const handleConfirmOrder = async () => {
    if (items.length === 0) return;

    // Basic validation
    if (!customer.name.trim()) {
      alert('من فضلك أدخل اسم العميل لتسجيل الطلب.');
      return;
    }
    if (!customer.phone.trim()) {
      alert('من فضلك أدخل رقم الهاتف لتأكيد الطلب والتوصيل.');
      return;
    }
    if (orderType === 'delivery' && !customer.address.trim()) {
      alert('من فضلك أدخل العنوان بالتفصيل.');
      return;
    }

    // التحقق من حالة المطعم وإشعار العميل إذا كان مغلقاً
    if (!currentStoreStatus.isOpen) {
      const proceed = confirm(
        `⚠️ تنبيه: ${currentStoreStatus.detailText}\n\nهل ترغب مع ذلك في إرسال الطلب عبر واتساب ليتم تسجيله وتجهيزه فور الفتح؟`
      );
      if (!proceed) {
        return;
      }
    }

    setIsSubmitting(true);

    // Play celebration success chime
    sounds.playSuccessChime();

    // Fire luxury celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#dc2626', '#d97706', '#059669', '#ffffff']
    });

    try {
      // Generate clean summary of ordered items for kitchen / monitor display
      const itemsLines = items.map((item) => {
        let text = `${item.name} × ${item.quantity}`;
        if (item.selectedSize) text += ` (${item.selectedSize})`;
        const details: string[] = [];
        if (item.extras && item.extras.length > 0) {
          details.push(`إضافات: ${item.extras.map(e => e.name).join('، ')}`);
        }
        if (item.itemNotes && item.itemNotes.length > 0) {
          details.push(item.itemNotes.join('، '));
        }
        if (details.length > 0) {
          text += ` [${details.join(' • ')}]`;
        }
        const itemTotal = item.price * item.quantity;
        text += ` — ${itemTotal} ج.م`;
        return text;
      });

      const combinedNotes = [
        itemsLines.length > 0 ? `الأصناف:\n${itemsLines.join('\n')}` : '',
        customer.orderNotes ? `ملاحظات العميل: ${customer.orderNotes}` : ''
      ].filter(Boolean).join('\n\n');

      // Save order payload to Supabase backend
      const orderPayload = {
        customer_name: customer.name,
        customer_phone: customer.phone,
        order_type: orderType,
        delivery_zone: orderType === 'pickup' ? 'استلام من المطعم (تيك أواي)' : (selectedZone?.name || 'سنهور القبلية'),
        delivery_address: customer.address,
        building_notes: customer.buildingFloorNotes,
        special_notes: combinedNotes,
        payment_method: paymentMethod,
        items_count: totalItems,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discount,
        total_amount: total,
        coupon_code: appliedCoupon,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const saveResult = await saveOrderToSupabase(orderPayload);
      if (saveResult && saveResult.success === false) {
        throw new Error(saveResult.error || 'تعذر حفظ الطلب');
      }

      // Generate WhatsApp rich formatted message and open chat
      const waText = generateWhatsAppMessage({
        items,
        customer,
        orderType,
        selectedZoneId,
        paymentMethod,
        subtotal,
        deliveryFee,
        discountAmount: discount,
        total,
        couponCode: appliedCoupon,
        freeGiftText: (cartIncentiveSettings?.isEnabled !== false && isGoalReached && cartIncentiveSettings?.includeInWhatsApp !== false)
          ? rewardText
          : null,
        deliveryZonesList: activeDeliveryZones
      });

      // Increment coupon usage count if a coupon was used
      if (appliedCoupon) {
        useMenuStore.getState().incrementCouponUsage(appliedCoupon);
      }

      // تفريغ السلة فقط عند اكتمال ونجاح الطلب
      clearCart();

      setTimeout(() => {
        openWhatsAppChat(restaurantInfo.whatsapp, waText);
        setIsSubmitting(false);
        setIsCartOpen(false);
      }, 600);
    } catch (err: any) {
      console.error('Order creation error:', err);
      alert('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl h-full bg-white border-r border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                سلة الطلبات الملكية
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  {totalItems} أصناف
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">لؤلؤة سنهور - كشري وطواجن</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition"
              >
                مسح الكل
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6">
          
          {/* تنبيه حالة المطعم إذا كان مغلقاً أو في إجازة */}
          {!currentStoreStatus.isOpen && (
            <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 space-y-1.5 shadow-sm animate-pulse">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span>تنبيه: {currentStoreStatus.reason === 'vacation' ? 'المطعم في إجازة حالياً 🌴' : 'المطعم مغلق حالياً ⏰'}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-red-700 leading-relaxed font-semibold">
                {currentStoreStatus.detailText}
              </p>
            </div>
          )}

          {/* Incentive Bar - Only rendered if enabled in Admin Settings */}
          {items.length > 0 && cartIncentiveSettings?.isEnabled !== false && (
            <div className={`p-4 rounded-2xl border transition-all duration-300 space-y-2.5 ${
              isGoalReached
                ? 'bg-gradient-to-r from-emerald-50 via-amber-50 to-orange-50 border-emerald-300/80 shadow-xs ring-1 ring-emerald-200'
                : 'bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-red-100'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={`flex items-center gap-1.5 ${isGoalReached ? 'text-emerald-800' : 'text-amber-800'}`}>
                  <span className="text-base">{cartIncentiveSettings?.rewardIcon || '🎁'}</span>
                  <span>{isGoalReached ? postGoalMessage : preGoalMessage}</span>
                </span>
                <span className={`text-xs font-black ${isGoalReached ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-white rounded-full overflow-hidden p-0.5 border border-amber-200 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGoalReached
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500 animate-pulse'
                      : 'bg-gradient-to-r from-red-600 to-amber-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              {isGoalReached && (
                <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold bg-emerald-100/60 px-2.5 py-1 rounded-xl">
                  <span>✨ تم تفعيل الهدية الخاصة بنجاح مع طلبك</span>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">هدية مجانية 100%</span>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-inner">
                <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">سلتك فارغة حالياً</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
                  اختر ما تشتهيه من العلب الملكية والطواجن الفخارة الساخنة وأضفه لطلبك!
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md ruby-button-shadow transition"
              >
                <span>تصفح المنيو الآن</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  الأصناف المختارة:
                </label>
                {items.map((item) => {
                  const isKoshary = isKosharyItem(item);
                  const isNoteOpen = openNotesItemId === item.id;
                  const itemNoteList = (item.itemNotes && item.itemNotes.length > 0)
                    ? item.itemNotes
                    : (item.notes ? item.notes.split(' • ').map(s => s.trim()).filter(Boolean) : []);
                  const notesCount = itemNoteList.length;

                  // Check if item is a custom designed dish
                  const isCustomDish = !!item.customDishDetails || item.menuItemId.startsWith('custom-dish') || (!!item.notes && item.notes.includes('الأساس:'));

                  const customDetails = item.customDishDetails || (() => {
                    if (!item.notes || !item.notes.includes('الأساس:')) return null;
                    const parts = item.notes.split(' | ');
                    const parsed: {
                      base?: string;
                      meat?: string;
                      spice?: string;
                      toppings?: string[];
                      noOptions?: string[];
                      customNotes?: string[];
                    } = {};

                    parts.forEach(part => {
                      if (part.startsWith('الأساس:')) parsed.base = part.replace('الأساس:', '').trim();
                      else if (part.startsWith('البروتين:')) parsed.meat = part.replace('البروتين:', '').trim();
                      else if (part.startsWith('درجة الشطة:')) parsed.spice = part.replace('درجة الشطة:', '').trim();
                      else if (part.startsWith('الإضافات:')) {
                        const t = part.replace('الإضافات:', '').trim();
                        parsed.toppings = t === 'بدون' ? [] : t.split('، ').map(s => s.trim()).filter(Boolean);
                      }
                      else if (part.startsWith('بدون:')) {
                        parsed.noOptions = part.replace('بدون:', '').trim().split('، ').map(s => s.trim()).filter(Boolean);
                      }
                      else if (part.startsWith('ملاحظات:')) {
                        parsed.customNotes = part.replace('ملاحظات:', '').trim().split('، ').map(s => s.trim()).filter(Boolean);
                      }
                    });

                    if (parsed.base || parsed.meat || parsed.spice) {
                      return {
                        base: parsed.base || 'طاجن مكرونة',
                        meat: parsed.meat || 'لحمة مفرومة',
                        spice: parsed.spice || 'بارد',
                        toppings: parsed.toppings || [],
                        noOptions: parsed.noOptions,
                        customNotes: parsed.customNotes
                      };
                    }
                    return null;
                  })();

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 space-y-2.5 ${
                        isNoteOpen
                          ? 'bg-amber-50/50 border-amber-300 shadow-md ring-1 ring-amber-200'
                          : 'bg-slate-50 border-slate-200/80 hover:border-red-200'
                      }`}
                    >
                      {/* Top Row: Image + Name/Price + Quantity Controls + Pencil + Delete */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200 shadow-xs">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {item.name}
                            </h4>
                            {isKoshary && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 text-[10px] font-black border border-amber-300/60 shrink-0">
                                🍲 كشري
                              </span>
                            )}
                            {isCustomDish && (
                              <span className="px-2 py-0.5 rounded-md bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-900 text-[10px] font-black border border-amber-300/80 shrink-0 shadow-2xs">
                                👑 طاجن مخصوص
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-black text-red-600">
                            {item.price * item.quantity} ج.م
                          </div>
                        </div>

                        {/* Quantity controls & Pencil & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                              title="تقليل العدد"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => {
                                sounds.playAddChime();
                                updateQuantity(item.id, 1);
                              }}
                              className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
                              title="زيادة العدد"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Pencil button (ملاحظات الكشري) */}
                          {isKoshary && (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playAddChime();
                                setOpenNotesItemId(prev => prev === item.id ? null : item.id);
                              }}
                              className={`relative p-2 rounded-xl transition flex items-center justify-center cursor-pointer shadow-xs ${
                                isNoteOpen
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/30 ring-2 ring-amber-400'
                                  : notesCount > 0
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50'
                              }`}
                              title={isNoteOpen ? 'إغلاق الملاحظات' : 'إضافة أو تعديل ملاحظات الكشري (بدون بصل، بدون شطة...)'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              {notesCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-amber-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                                  {notesCount}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Delete Item button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0 cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Rich Custom Dish Breakdown Card */}
                      {customDetails && (
                        <div className="p-3 rounded-2xl bg-linear-to-br from-amber-50/90 via-orange-50/40 to-rose-50/60 border-2 border-amber-200/90 shadow-xs space-y-2 text-xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
                            <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>مكونات وتفاصيل الطاجن المخصوص:</span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                              تجهيز فوري للشيف 👨‍🍳
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {/* 🍲 الأساس */}
                            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-amber-100/90 shadow-2xs">
                              <span className="text-[11px] font-bold text-amber-800 shrink-0">🍲 الأساس:</span>
                              <span className="font-black text-slate-900 truncate">{customDetails.base}</span>
                            </div>

                            {/* 🥩 البروتين */}
                            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-amber-100/90 shadow-2xs">
                              <span className="text-[11px] font-bold text-rose-800 shrink-0">🥩 البروتين:</span>
                              <span className="font-black text-rose-950 truncate">{customDetails.meat}</span>
                            </div>

                            {/* 🌶️ درجة الشطة */}
                            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-amber-100/90 shadow-2xs">
                              <span className="text-[11px] font-bold text-red-700 shrink-0">🌶️ الشطة:</span>
                              <span className="font-black text-red-600">{customDetails.spice}</span>
                            </div>

                            {/* ✨ المقرمشات والإضافات */}
                            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-amber-100/90 shadow-2xs col-span-1 sm:col-span-2">
                              <span className="text-[11px] font-bold text-emerald-800 shrink-0">✨ المقرمشات والإضافات:</span>
                              <span className={`font-black text-xs ${customDetails.toppings && customDetails.toppings.length > 0 ? 'text-emerald-900' : 'text-slate-500 font-medium'}`}>
                                {customDetails.toppings && customDetails.toppings.length > 0
                                  ? customDetails.toppings.join(' • ')
                                  : 'بدون مقرمشات إضافية'}
                              </span>
                            </div>

                            {/* 🚫 بدون / مستبعد */}
                            {customDetails.noOptions && customDetails.noOptions.length > 0 && (
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-100/70 border border-rose-200/90 shadow-2xs col-span-1 sm:col-span-2">
                                <span className="text-[11px] font-bold text-rose-800 shrink-0">🚫 بدون / مستبعد:</span>
                                <span className="font-black text-xs text-rose-950">
                                  {customDetails.noOptions.join(' • ')}
                                </span>
                              </div>
                            )}

                            {/* 💬 ملاحظات خاصة */}
                            {customDetails.customNotes && customDetails.customNotes.length > 0 && (
                              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-50 border border-purple-200/90 shadow-2xs col-span-1 sm:col-span-2">
                                <span className="text-[11px] font-bold text-purple-800 shrink-0">💬 ملاحظات خاصة:</span>
                                <span className="font-bold text-xs text-purple-950">
                                  {customDetails.customNotes.join(' • ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Display active notes tags if any for regular items */}
                      {!customDetails && notesCount > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-amber-800 flex items-center gap-0.5">
                            <span>ملاحظات:</span>
                          </span>
                          {itemNoteList.map((note, noteIdx) => (
                            <span
                              key={noteIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold shadow-2xs"
                            >
                              <span>{note.startsWith('بدون') ? '🚫' : '💬'} {note}</span>
                              <button
                                type="button"
                                onClick={() => removeItemNote(item.id, noteIdx)}
                                className="w-3.5 h-3.5 rounded-full hover:bg-amber-300/80 text-amber-800 hover:text-rose-700 flex items-center justify-center transition cursor-pointer ml-0.5"
                                title="إزالة هذه الملاحظة"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded Notes Controls (when pencil button clicked) */}
                      {isKoshary && isNoteOpen && (
                        <div className="mt-2 p-3 rounded-2xl bg-white border-2 border-amber-300 shadow-sm space-y-3 animate-fadeIn">
                          
                          <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>ملاحظات وتخصيص ({item.name}):</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setOpenNotesItemId(null)}
                              className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            >
                              إخفاء ✕
                            </button>
                          </div>

                          {/* 1. Dropdown matching the user's screenshot with bright blue '+' button */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span>اختر من القائمة المجهزة:</span>
                              <span className="text-[10px] text-slate-400 font-normal">اضغط + لإضافة خيار آخر</span>
                            </label>

                            <div className="flex items-center gap-2">
                              {/* Dropdown Select */}
                              <div className="relative flex-1">
                                <select
                                  value={itemPresetSelection[item.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setItemPresetSelection(prev => ({ ...prev, [item.id]: val }));
                                    if (val) {
                                      addItemNote(item.id, val);
                                      sounds.playAddChime();
                                      // Reset select so user can immediately choose another!
                                      setTimeout(() => {
                                        setItemPresetSelection(prev => ({ ...prev, [item.id]: '' }));
                                      }, 150);
                                    }
                                  }}
                                  className="w-full py-2 px-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 text-xs font-bold focus:border-[#0284c7] focus:outline-none transition cursor-pointer"
                                >
                                  <option value="">— بدون ملاحظة —</option>
                                  {activeKosharyPresets.map((preset) => {
                                    const alreadyInNotes = itemNoteList.includes(preset);
                                    return (
                                      <option key={preset} value={preset} disabled={alreadyInNotes}>
                                        {preset} {alreadyInNotes ? '✓ (مضاف)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Prominent Blue Plus Button as in the image! */}
                              <button
                                type="button"
                                onClick={() => {
                                  const val = itemPresetSelection[item.id];
                                  if (val) {
                                    addItemNote(item.id, val);
                                    sounds.playAddChime();
                                    setItemPresetSelection(prev => ({ ...prev, [item.id]: '' }));
                                  }
                                }}
                                disabled={!itemPresetSelection[item.id]}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition shadow-sm cursor-pointer shrink-0 ${
                                  itemPresetSelection[item.id]
                                    ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white active:scale-95 shadow-md'
                                    : 'bg-[#0284c7]/40 text-white/70 cursor-not-allowed'
                                }`}
                                title="إضافة الملاحظة المختارة"
                              >
                                <Plus className="w-5 h-5 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>

                          {/* 2. Custom text note with plus button */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                              <span>أو اكتب ملاحظة خاصة (إضافية):</span>
                              <span className="text-[10px] text-slate-400 font-normal">اضغط Enter أو + للإضافة</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={itemCustomNote[item.id] || ''}
                                onChange={(e) => setItemCustomNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const text = itemCustomNote[item.id]?.trim();
                                    if (text) {
                                      addItemNote(item.id, text);
                                      sounds.playAddChime();
                                      setItemCustomNote(prev => ({ ...prev, [item.id]: '' }));
                                    }
                                  }
                                }}
                                placeholder="مثال: صلصة زيادة على جنب، دقة خفيفة..."
                                className="flex-1 py-2 px-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:border-amber-500 focus:bg-white focus:outline-none placeholder:text-slate-400"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const text = itemCustomNote[item.id]?.trim();
                                  if (text) {
                                    addItemNote(item.id, text);
                                    sounds.playAddChime();
                                    setItemCustomNote(prev => ({ ...prev, [item.id]: '' }));
                                  }
                                }}
                                disabled={!itemCustomNote[item.id]?.trim()}
                                className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1 transition shadow-xs cursor-pointer shrink-0 ${
                                  itemCustomNote[item.id]?.trim()
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95 shadow-sm'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                                title="إضافة الملاحظة المكتوبة"
                              >
                                <Plus className="w-4 h-4" />
                                <span>إضافة</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Smart Upsell Carousel */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    إضافات تكمل الأكيلة (إضافة سريعة بنقرة واحدة):
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-0.5 custom-scrollbar">
                  {displayedUpsellItems.map((upsell) => (
                    <button
                      key={upsell.id}
                      type="button"
                      onClick={() => {
                        sounds.playAddChime();
                        addItem(upsell, 1);
                      }}
                      className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50/30 text-right flex items-center justify-between gap-2 transition group shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-red-600 truncate">
                          + {upsell.name}
                        </div>
                        <div className="text-xs font-black text-red-600">
                          {upsell.price} ج.م
                        </div>
                      </div>
                      <span className="w-7 h-7 rounded-xl bg-red-50 group-hover:bg-red-600 text-red-600 group-hover:text-white flex items-center justify-center text-xs font-black transition shrink-0">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Type Selector */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  طريقة الاستلام:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'delivery', label: 'توصيل للمنزل', icon: <Bike className="w-4 h-4" /> },
                    { id: 'pickup', label: 'استلام من المطعم', icon: <Store className="w-4 h-4" /> }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOrderType(t.id as OrderType)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-2xl border text-xs font-bold transition ${
                        orderType === t.id
                          ? 'bg-red-50 border-red-600 text-red-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className={orderType === t.id ? 'text-red-600' : 'text-slate-500'}>
                        {t.icon}
                      </span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Zone Selector if delivery - تصميم راقي ومريح على شاشة الموبايل */}
              {orderType === 'delivery' && (
                <div className="space-y-2.5 p-3 sm:p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-black text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      منطقة التوصيل:
                    </label>
                    {selectedZone && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-lg border border-amber-300/60">
                        ⏱️ {selectedZone.estimatedMinutes}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="w-full p-2.5 sm:p-3 pl-8 rounded-xl bg-white border border-amber-200 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs appearance-none cursor-pointer"
                    >
                      {activeDeliveryZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} • {zone.fee} ج.م توصيل{isMinOrderEnabled ? ` (أقل طلب: ${zone.minOrder} ج.م)` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedZone && (
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 px-1 border-t border-amber-200/50">
                      <div className="flex items-center gap-1.5">
                        <span>رسوم التوصيل:</span>
                        <span className="font-black text-amber-700">{selectedZone.fee} ج.م</span>
                      </div>
                      {isMinOrderEnabled && (
                        <div className="text-[10px] font-bold text-slate-500">
                          أقل طلب: <span className="text-amber-800">{selectedZone.minOrder} ج.م</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Information (CRM & Auto-save) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  بيانات العميل (تُحفظ تلقائياً):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({ name: e.target.value })}
                      placeholder="الاسم الكريم *"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 shadow-xs"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ phone: e.target.value })}
                      placeholder="رقم الموبايل *"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 shadow-xs"
                    />
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <>
                    <input
                      type="text"
                      value={customer.address}
                      onChange={(e) => setCustomer({ address: e.target.value })}
                      placeholder="العنوان بالتفصيل (اسم الشارع / علامة مميزة) *"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 shadow-xs"
                    />
                    <input
                      type="text"
                      value={customer.buildingFloorNotes || ''}
                      onChange={(e) => setCustomer({ buildingFloorNotes: e.target.value })}
                      placeholder="رقم العمارة / الدور / الشقة (اختياري)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 shadow-xs"
                    />
                  </>
                )}

                <input
                  type="text"
                  value={customer.orderNotes || ''}
                  onChange={(e) => setCustomer({ orderNotes: e.target.value })}
                  placeholder="ملاحظات إضافية على الطلب..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    طريقة الدفع:
                  </label>
                  {!isWalletPaymentEnabled && !isInstapayPaymentEnabled && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      كاش عند الاستلام
                    </span>
                  )}
                </div>

                {(() => {
                  const availablePaymentMethods = [
                    { id: 'cash', label: 'كاش عند الاستلام', icon: <CreditCard className="w-4 h-4" /> },
                    ...(isWalletPaymentEnabled
                      ? [{ id: 'vodafone_cash', label: 'محفظة كاش', icon: <Zap className="w-4 h-4" /> }]
                      : []),
                    ...(isInstapayPaymentEnabled
                      ? [{ id: 'instapay', label: 'إنستاباي', icon: <Sparkles className="w-4 h-4" /> }]
                      : [])
                  ];

                  const gridClass = availablePaymentMethods.length === 3
                    ? 'grid-cols-3'
                    : availablePaymentMethods.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-1';

                  return (
                    <div className={`grid ${gridClass} gap-2.5`}>
                      {availablePaymentMethods.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                          className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition flex ${
                            availablePaymentMethods.length === 1 ? 'flex-row justify-center py-3' : 'flex-col'
                          } items-center gap-1.5 ${
                            paymentMethod === p.id
                              ? 'bg-red-50 border-red-600 text-red-700 shadow-xs ring-1 ring-red-200'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span className={paymentMethod === p.id ? 'text-red-600' : 'text-slate-400'}>
                            {p.icon}
                          </span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Vodafone cash details box */}
                {isWalletPaymentEnabled && paymentMethod === 'vodafone_cash' && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-red-900 font-bold">رقم محفظة فودافون كاش:</span>
                      <button
                        onClick={() => handleCopy(walletPhoneNumber || restaurantInfo.cashWalletNumber, 'wallet')}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition shadow-xs"
                      >
                        {copiedWallet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedWallet ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-base font-black text-red-700 text-center py-1 tracking-wider">
                      {walletPhoneNumber || restaurantInfo.cashWalletNumber}
                    </div>
                    <p className="text-[11px] text-slate-600 text-center">
                      باسم: {restaurantInfo.cashWalletName} (برجاء إرسال إشعار التحويل عبر واتساب)
                    </p>
                  </div>
                )}

                {/* InstaPay details box */}
                {isInstapayPaymentEnabled && paymentMethod === 'instapay' && (
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-900 font-bold">معرف إنستاباي InstaPay:</span>
                      <button
                        onClick={() => handleCopy(instapayHandle || restaurantInfo.instapayHandle, 'instapay')}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition shadow-xs"
                      >
                        {copiedInstapay ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedInstapay ? 'تم النسخ!' : 'نسخ المعرف'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-sm font-black text-purple-700 text-center py-1">
                      {instapayHandle || restaurantInfo.instapayHandle}
                    </div>
                    <a
                      href={restaurantInfo.instapayLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      فتح رابط الدفع في تطبيق InstaPay مباشرة
                    </a>
                  </div>
                )}
              </div>

              {/* Coupon Code Section - Only visible if enabled from Admin Settings */}
              {isCouponsEnabled && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="أدخل كود الخصم (كوبون)..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 uppercase focus:outline-none focus:border-red-500 shadow-xs font-bold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
                    >
                      تطبيق الكوبون
                    </button>
                  </form>

                  {couponMessage && (
                    <p className={`text-xs font-bold ${couponMessage.isError ? 'text-red-600' : 'text-emerald-600'} animate-fadeIn`}>
                      {couponMessage.text}
                    </p>
                  )}

                  {appliedCoupon && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs shadow-2xs animate-fadeIn">
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم تفعيل الكوبون بنجاح ({appliedCoupon})</span>
                      </span>
                      <button
                        onClick={removeCoupon}
                        className="text-slate-400 hover:text-red-600 text-xs font-bold transition cursor-pointer"
                      >
                        إلغاء الخصم
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>المجموع الفرعي:</span>
                  <span className="font-bold">{subtotal} ج.م</span>
                </div>

                {orderType === 'delivery' && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>رسوم التوصيل ({selectedZone?.name}):</span>
                    <span className="font-bold">{deliveryFee} ج.م</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>الخصم ({appliedCoupon}):</span>
                    <span className="font-bold">-{discount} ج.م</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-base font-black text-slate-900">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-xl text-red-600 font-black">
                    {total} ج.م
                  </span>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Drawer Footer Actions */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm sm:text-base shadow-xl flex items-center justify-between transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                <span>{isSubmitting ? 'جاري تجهيز الفاتورة...' : 'إرسال الطلب عبر واتساب'}</span>
              </span>
              <span className="font-black text-lg text-emerald-100">
                {total} ج.م 💬
              </span>
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
              🔒 سيتم إرسال فاتورة رقمية منسقة لإدارة المطعم وتأكيد التجهيز فوراً
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
