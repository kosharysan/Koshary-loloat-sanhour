import { CartItem, CustomerInfo, OrderType, PaymentMethod } from '@/types';
import { deliveryZones, restaurantInfo } from '@/data/mockData';

interface GenerateWhatsAppMessageProps {
  items: CartItem[];
  customer: CustomerInfo;
  orderType: OrderType;
  selectedZoneId: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  couponCode?: string | null;
  freeGiftText?: string | null;
  deliveryZonesList?: any[];
  walletPhoneNumber?: string;
  instapayHandle?: string;
}

// Unicode Right-to-Left Mark (RLM) to ensure 100% consistent right-aligned Arabic text in WhatsApp
const RLM = '\u200F';

export function generateWhatsAppMessage({
  items,
  customer,
  orderType,
  selectedZoneId,
  paymentMethod,
  subtotal,
  deliveryFee,
  discountAmount,
  total,
  couponCode,
  freeGiftText,
  deliveryZonesList,
  walletPhoneNumber,
  instapayHandle,
}: GenerateWhatsAppMessageProps): string {
  const activeZones = (deliveryZonesList && deliveryZonesList.length > 0) ? deliveryZonesList : deliveryZones;
  const zone = activeZones.find(z => z.id === selectedZoneId) || activeZones[0];
  const liveWallet = (walletPhoneNumber || restaurantInfo.cashWalletNumber || '').trim();
  const liveInstapay = (instapayHandle || restaurantInfo.instapayHandle || '').trim();

  const orderTypeArabic = {
    delivery: '🛵 توصيل للمنزل (دليفري)',
    pickup: '🏪 استلام من المطعم (تيك أواي)'
  }[orderType] || '🛵 توصيل للمنزل (دليفري)';

  const paymentMethodArabic = {
    cash: '💵 كاش عند الاستلام',
    vodafone_cash: `📱 محفظة كاش (${liveWallet})`,
    instapay: `⚡ إنستاباي (${liveInstapay})`
  }[paymentMethod];

  // Items list formatting with guaranteed RTL alignment and clean indented bullets
  const itemsText = items
    .map((item, idx) => {
      const isCustomDish = Boolean(item.customDishDetails);
      const itemIcon = isCustomDish ? '🍲' : '🍽️';
      let itemBlock = `${RLM}${itemIcon} *${idx + 1}. ${item.name}* (الكمية: ${item.quantity}) ⬅️ *${item.price * item.quantity} ج.م*`;
      
      const customDetails = item.customDishDetails;
      if (customDetails) {
        const subLines: string[] = [
          `👑 *مواصفات الطاجن المخصوص:*`,
          `🍲 الأساس: *${customDetails.base}*`,
          `🥩 البروتين: *${customDetails.meat}*`,
          `🌶️ الشطة: *${customDetails.spice}*`,
          `✨ المقرمشات/الإضافات: *${customDetails.toppings && customDetails.toppings.length > 0 ? customDetails.toppings.join(' + ') : 'بدون مقرمشات إضافية'}*`
        ];

        if (customDetails.noOptions && customDetails.noOptions.length > 0) {
          subLines.push(`🚫 *استبعاد (بدون):* ${customDetails.noOptions.join(' ، ')}`);
        }

        const allChefNotes = [
          ...(customDetails.customNotes || []),
          ...(item.itemNotes && item.itemNotes.length > 0
            ? item.itemNotes.filter(n => !customDetails.customNotes?.includes(n) && !customDetails.noOptions?.includes(n))
            : [])
        ];

        if (allChefNotes.length > 0) {
          subLines.push(`💬 *ملاحظات الشيف:* ${allChefNotes.join(' ، ')}`);
        }

        itemBlock += '\n' + subLines.map(sl => `${RLM}   ${sl}`).join('\n');
      } else {
        // Regular items (كشري، طواجن عادية، إضافات...)
        const notesList = item.itemNotes && item.itemNotes.length > 0
          ? item.itemNotes
          : (item.notes ? item.notes.split(' • ').map(s => s.trim()).filter(Boolean) : []);

        if (notesList.length > 0) {
          const noItems = notesList.filter(n => n.startsWith('بدون') || n.includes('بدون'));
          const otherNotes = notesList.filter(n => !n.startsWith('بدون') && !n.includes('بدون'));

          const subLines: string[] = [];
          if (noItems.length > 0) {
            subLines.push(`🚫 *استبعاد (بدون):* ${noItems.join(' ، ')}`);
          }
          if (otherNotes.length > 0) {
            subLines.push(`💬 *ملاحظات خاصة:* ${otherNotes.join(' ، ')}`);
          }

          if (subLines.length > 0) {
            itemBlock += '\n' + subLines.map(sl => `${RLM}   ${sl}`).join('\n');
          }
        }
      }
      return itemBlock;
    })
    .join('\n');

  const lines = [
    `${RLM}👑 *طلب جديد من مطعم لؤلؤة سنهور* 👑`,
    `${RLM}كشري وطواجن على أصولها`,
    `${RLM}────────────────────────`,
    `${RLM}📋 *بيانات العميل:*`,
    `${RLM}👤 *الاسم:* ${customer.name || 'عميل كريم'}`,
    `${RLM}📱 *الهاتف:* ${customer.phone || 'غير مسجل'}`,
    `${RLM}🏷️ *نوع الاستلام:* ${orderTypeArabic}`,
    ...(orderType === 'delivery'
      ? [
          `${RLM}📍 *المنطقة:* ${zone ? zone.name : 'غير محددة'}`,
          `${RLM}🏠 *العنوان:* ${customer.address || 'لم يُحدد'}`,
          ...(customer.buildingFloorNotes ? [`${RLM}🏢 *العمارة / الشقة:* ${customer.buildingFloorNotes}`] : [])
        ]
      : []),
    `${RLM}────────────────────────`,
    `${RLM}🧾 *تفاصيل الأصناف المطلوبة:*`,
    itemsText,
    `${RLM}────────────────────────`,
    `${RLM}💵 *ملخص الحساب:*`,
    `${RLM}▫️ المجموع الفرعي: ${subtotal} ج.م`,
    ...(orderType === 'delivery' ? [`${RLM}🛵 رسوم التوصيل: ${deliveryFee} ج.م`] : []),
    ...(discountAmount > 0 ? [`${RLM}🎁 كود الخصم (${couponCode}): -${discountAmount} ج.م`] : []),
    ...(freeGiftText ? [`${RLM}🎉 *هدية العرض الخاصة:* ${freeGiftText} (مجاناً مع الطلب ✨)`] : []),
    `${RLM}💎 *الإجمالي النهائي المطلوب: ${total} ج.م*`,
    `${RLM}────────────────────────`,
    `${RLM}💳 *طريقة الدفع:* ${paymentMethodArabic}`,
    ...(customer.orderNotes ? [`${RLM}📝 *ملاحظات الطلب:* ${customer.orderNotes}`] : []),
    ``,
    `${RLM}✨ *شكراً لطلبكم من لؤلؤة سنهور! سنقوم بتأكيد الطلب وتجهيزه فوراً.*`
  ];

  return lines.join('\n');
}

export const defaultConfirmNotificationTemplate = `👑 *مطعم لؤلؤة سنهور* 👑
أهلاً بك يا {customer_name}،
تم تأكيد طلبك رقم #{order_id} بنجاح! 🚀
وجاري تجهيزه بأعلى جودة ليكون جاهزاً في أقرب وقت.
💵 إجمالي الحساب: {total_amount} ج.م
شكراً لاختيارك لؤلؤة سنهور ونرجو لك وجبة شهية! 😋❤️`;

export const defaultCancelNotificationTemplate = `👑 *مطعم لؤلؤة سنهور* 👑
عزيزنا {customer_name}،
نعتذر منك، تم إلغاء طلبك رقم #{order_id} ({reason}).
💵 إجمالي الطلب: {total_amount} ج.م
إذا كان لديك أي استفسار أو رغبة في إعادة الطلب يمكنك التواصل معنا مباشرة.
شكراً لتفهمك ونعتذر عن أي إزعاج 🌹`;

export function formatWhatsAppNotification(
  template: string,
  order: any,
  options?: { reason?: string }
): string {
  if (!template) return '';
  const customerName = (order.customer_name || order.customer?.name || 'عميلنا العزيز').trim();
  const orderId = String(order.id || '').slice(-6) || '---';
  const totalAmount = order.total_amount ?? order.total ?? 0;
  const phone = order.customer_phone || order.customer?.phone || '';
  const reason = options?.reason || 'بناءً على التحديث في المطعم';
  const itemsCount = Array.isArray(order.items)
    ? order.items.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0)
    : 1;

  let text = template
    .replace(/{customer_name}/g, customerName)
    .replace(/{order_id}/g, orderId)
    .replace(/{total_amount}/g, String(totalAmount))
    .replace(/{phone}/g, phone)
    .replace(/{reason}/g, reason)
    .replace(/{items_count}/g, String(itemsCount));

  // Add RLM to each line for crisp Arabic formatting
  return text
    .split('\n')
    .map(line => (line.startsWith(RLM) || line.trim() === '') ? line : `${RLM}${line}`)
    .join('\n');
}

export function normalizeWhatsAppPhone(phone: string) {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
    cleanPhone = '2' + cleanPhone;
  }
  return cleanPhone;
}

export function getWhatsAppMeLink(phone: string) {
  return `https://wa.me/${normalizeWhatsAppPhone(phone)}`;
}

export function openWhatsAppChat(phone: string, text: string, targetWindow?: Window | null) {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(text);

  // Detect mobile vs desktop
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // On desktop: opening web.whatsapp.com directly avoids wa.me 302 redirect which corrupts UTF-8 emojis into 
  // On mobile: api.whatsapp.com opens the native WhatsApp mobile app cleanly
  const url = isMobile
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

  if (typeof window !== 'undefined') {
    // 1. If a pre-opened target window was provided (e.g., from synchronous click gesture on desktop)
    if (targetWindow && !targetWindow.closed) {
      try {
        targetWindow.location.href = url;
        return;
      } catch (e) {
        // Fall back below if target window navigation was intercepted
      }
    }

    // 2. On Mobile: direct navigation never triggers popup blockers and seamlessly opens WhatsApp native app
    if (isMobile) {
      window.location.href = url;
      return;
    }

    // 3. On Desktop without pre-opened window: try window.open, fall back to direct navigation if blocked
    const opened = window.open(url, '_blank');
    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      window.location.href = url;
    }
  }
}

export async function sendWhatsAppMessageApi(
  phone: string,
  text: string,
  instanceId: string,
  apiToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text, instanceId, apiToken }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `فشل الاتصال بمزود الواتساب (${res.status})` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر الإرسال عبر السيرفر' };
  }
}
