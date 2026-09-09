'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Lock,
  ShieldCheck,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Phone,
  MessageCircle,
  Store,
  DollarSign,
  Search,
  RefreshCw,
  LogOut,
  Sliders,
  AlertCircle,
  ExternalLink,
  Eye,
  Settings,
  Calendar,
  Users,
  Trash2,
  Camera,
  Plus,
  Edit2,
  Check,
  X,
  Save,
  Sparkles,
  Unlock,
  Zap,
  CreditCard,
  Gift,
  Tag,
  Percent,
  Copy,
  XCircle,
  Printer,
  FileText,
  BarChart3,
  History,
  Coins,
  Bike,
  AlertTriangle,
  Receipt,
  MapPin,
  User
} from 'lucide-react';
import { Coupon, DeliveryZone, StoreScheduleSettings, ClosedShift } from '@/types';
import { restaurantInfo as defaultInfo, menuItems as defaultMenuItems, deliveryZones as defaultZones } from '@/data/mockData';
import { fetchOrdersFromDatabase, updateOrderStatusInDb, deleteOrderFromDatabase, fetchShiftsData, closeShiftInDatabase } from '@/lib/supabase';
import { MenuManagementTab } from '@/components/admin/MenuManagementTab';
import { useMenuStore, defaultKosharyCustomOptions, defaultCartIncentiveSettings, defaultStoreScheduleSettings, defaultWhatsAppNotificationSettings, computeStoreStatus, WEEK_DAYS_AR } from '@/lib/menuStore';
import { defaultConfirmNotificationTemplate, defaultCancelNotificationTemplate, formatWhatsAppNotification, openWhatsAppChat, sendWhatsAppMessageApi } from '@/lib/whatsapp';

// استخراج تفاصيل الأصناف وملاحظات العميل من النص المنظم للطلب
function parseOrderDetails(specialNotes?: string) {
  if (!specialNotes || !specialNotes.trim()) {
    return { items: [], notes: '' };
  }
  const raw = specialNotes.trim();
  let itemsPart = raw;
  let notesPart = '';

  if (raw.includes('ملاحظات العميل:')) {
    const parts = raw.split('ملاحظات العميل:');
    itemsPart = parts[0];
    notesPart = parts.slice(1).join('ملاحظات العميل:').trim();
  } else if (raw.includes('ملاحظات الأوردر:')) {
    const parts = raw.split('ملاحظات الأوردر:');
    itemsPart = parts[0];
    notesPart = parts.slice(1).join('ملاحظات الأوردر:').trim();
  }

  itemsPart = itemsPart.replace(/^الأصناف:\s*/i, '').trim();

  const itemsList = itemsPart
    ? itemsPart.split('\n').map(s => s.trim()).filter(Boolean)
    : [];

  return { items: itemsList, notes: notesPart };
}

// تحليل سطر الصنف المنفرد لاستخراج الاسم والكمية والحجم والسعر وتفاصيل الطاجن المخصوص
function parseItemLine(itemStr: string) {
  const clean = itemStr.replace(/^\d+[\.\-]\s*/, '').replace(/^[•\-]\s*/, '').trim();
  let nameAndDetails = clean;
  let price: string | null = null;
  if (clean.includes(' — ')) {
    const parts = clean.split(' — ');
    nameAndDetails = parts.slice(0, -1).join(' — ').trim();
    price = parts[parts.length - 1].trim();
  }
  let detailsStr = '';
  const bracketMatch = nameAndDetails.match(/\[(.*?)\]/);
  if (bracketMatch) {
    detailsStr = bracketMatch[1].trim();
    nameAndDetails = nameAndDetails.replace(/\[.*?\]/, '').trim();
  }
  let quantity = '1';
  const qtyMatch = nameAndDetails.match(/[×xX]\s*(\d+)/);
  if (qtyMatch) {
    quantity = qtyMatch[1];
    nameAndDetails = nameAndDetails.replace(/[×xX]\s*\d+/, '').trim();
  }

  const isCustom = nameAndDetails.includes('طاجن') || detailsStr.includes('الأساس:') || detailsStr.includes('أساس:') || detailsStr.includes('البروتين:') || detailsStr.includes('بروتين:');

  let size: string | undefined = undefined;
  let proteinFromTitle: string | undefined = undefined;
  const parenMatch = nameAndDetails.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    if (isCustom) {
      if (!detailsStr.includes('البروتين') && !detailsStr.includes('بروتين')) {
        proteinFromTitle = inside;
      }
    } else {
      size = inside;
    }
    nameAndDetails = nameAndDetails.replace(/\([^)]+\)/g, '').trim();
  }

  const name = isCustom ? 'طاجن مبتكر خاص' : nameAndDetails.trim();

  let base: string | undefined = undefined;
  let without: string | undefined = undefined;
  let protein: string | undefined = proteinFromTitle;
  let spice: string | undefined = undefined;
  let extras: string | undefined = undefined;
  let notes: string | undefined = undefined;

  const withoutSet = new Set<string>();
  const notesSet = new Set<string>();

  if (detailsStr) {
    const segments = detailsStr.split(/[|•]/).map(s => s.trim()).filter(Boolean);
    for (const seg of segments) {
      if (seg.startsWith('الأساس:') || seg.startsWith('أساس:')) {
        base = seg.replace(/^(الأساس|أساس):\s*/, '').trim();
      } else if (seg.startsWith('البروتين:') || seg.startsWith('بروتين:')) {
        protein = seg.replace(/^(البروتين|بروتين):\s*/, '').trim();
      } else if (seg.startsWith('الشطة:') || seg.startsWith('شطة:')) {
        spice = seg.replace(/^(الشطة|شطة):\s*/, '').trim();
      } else if (seg.startsWith('إضافات:') || seg.startsWith('الإضافات:')) {
        extras = seg.replace(/^(إضافات|الإضافات):\s*/, '').trim();
      } else if (seg.startsWith('ملاحظات:') || seg.startsWith('ملاحظة:')) {
        const rawList = seg.replace(/^(ملاحظات|ملاحظة):\s*/, '').split(/[،,]/);
        rawList.forEach(item => {
          const cleanItem = item.replace(/^(ملاحظات|ملاحظة):?\s*/, '').replace(/[:،]/g, '').trim();
          if (cleanItem) notesSet.add(cleanItem);
        });
      } else if (seg.startsWith('بدون:')) {
        const rawList = seg.replace(/^بدون:\s*/, '').split(/[،,]/);
        rawList.forEach(item => {
          const cleanItem = item.replace(/بدون/g, '').replace(/[:،]/g, '').trim();
          if (cleanItem) withoutSet.add(cleanItem);
        });
      } else if (seg.includes('بدون')) {
        const rawList = seg.split(/[،,]/);
        rawList.forEach(item => {
          if (item.includes('بدون')) {
            const cleanItem = item.replace(/بدون/g, '').replace(/[:،]/g, '').trim();
            if (cleanItem) withoutSet.add(cleanItem);
          } else {
            const cleanItem = item.trim();
            if (cleanItem) notesSet.add(cleanItem);
          }
        });
      } else {
        const rawList = seg.split(/[،,]/);
        rawList.forEach(item => {
          const cleanItem = item.trim();
          if (cleanItem) notesSet.add(cleanItem);
        });
      }
    }
  }

  if (withoutSet.size > 0) {
    without = Array.from(withoutSet).join('، ');
  }
  if (notesSet.size > 0) {
    notes = Array.from(notesSet).join('، ');
  }

  const extrasList = extras
    ? extras.split(/[،,•]/).map(s => s.trim()).filter(Boolean)
    : [];

  return {
    name,
    quantity,
    size,
    price,
    details: detailsStr,
    isCustom,
    base,
    without,
    protein,
    spice,
    extras,
    extrasList,
    notes
  };
}

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'coupons' | 'settings'>('orders');

  // تبويبات قسم الطلبات والمبيعات: 1. الوردية الحالية 2. فواتير الورديات 3. التقرير الشهري والسنوي
  const [ordersSubTab, setOrdersSubTab] = useState<'current_shift' | 'shifts_history' | 'reports'>('current_shift');
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>([]);
  const [currentShiftStartTime, setCurrentShiftStartTime] = useState<string>('');
  const [currentShiftNumber, setCurrentShiftNumber] = useState<number>(1);
  const [archivedOrderIds, setArchivedOrderIds] = useState<string[]>([]);
  const [selectedShiftForView, setSelectedShiftForView] = useState<ClosedShift | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null);
  const [selectedOrderShiftNumber, setSelectedOrderShiftNumber] = useState<number | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [shiftInvoicesSearchQuery, setShiftInvoicesSearchQuery] = useState('');
  const [shiftInvoicesStatusFilter, setShiftInvoicesStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [currentShiftSearchQuery, setCurrentShiftSearchQuery] = useState('');

  // فلاتر تبويبة فواتير الورديات المقفلة (بالوردية أو باسم ورقم هاتف العميل)
  const [shiftSearchMode, setShiftSearchMode] = useState<'by_shift' | 'by_customer'>('by_shift');
  const [shiftCustomerSearchQuery, setShiftCustomerSearchQuery] = useState('');
  const [shiftPeriodFilter, setShiftPeriodFilter] = useState<'all' | 'specific' | 'today' | 'week' | 'month' | 'quarter' | 'half_year' | 'year' | 'custom'>('all');
  const [shiftFilterSpecificShift, setShiftFilterSpecificShift] = useState<string>('all');
  const [shiftCustomStart, setShiftCustomStart] = useState<string>('');
  const [shiftCustomEnd, setShiftCustomEnd] = useState<string>('');

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Time, Range, and Customer Search Filters
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const [storeStatus, setStoreStatus] = useState<boolean>(defaultInfo.isOpen);
  const [walletPhone, setWalletPhone] = useState(defaultInfo.cashWalletNumber);
  const [instapayId, setInstapayId] = useState(defaultInfo.instapayHandle);
  const [restaurantPhone, setRestaurantPhone] = useState(defaultInfo.phone);
  const [zonesList, setZonesList] = useState(defaultZones);
  const [savedNotice, setSavedNotice] = useState(false);

  // Koshary Custom Options Management, Payment Settings & Coupons
  const {
    kosharyCustomOptions,
    addKosharyCustomOption,
    updateKosharyCustomOption,
    deleteKosharyCustomOption,
    isWalletPaymentEnabled,
    isInstapayPaymentEnabled,
    walletPhoneNumber,
    instapayHandle,
    toggleWalletPayment,
    toggleInstapayPayment,
    setWalletPhoneNumber,
    setInstapayHandle,
    isCouponsEnabled,
    coupons,
    toggleCouponsEnabled,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponActive,
    cartIncentiveSettings,
    toggleCartIncentiveEnabled,
    updateCartIncentiveSettings,
    deliveryZones,
    isMinOrderEnabled,
    toggleMinOrderEnabled,
    addDeliveryZone,
    updateDeliveryZone,
    deleteDeliveryZone,
    resetDeliveryZones,
    storeScheduleSettings = defaultStoreScheduleSettings,
    updateStoreScheduleSettings,
    toggleStoreManualStatus,
    monitorPassword = 'sanhour123',
    setMonitorPassword,
    whatsappNotificationSettings = defaultWhatsAppNotificationSettings,
    updateWhatsAppNotificationSettings,
    toggleWhatsAppNotificationEnabled,
    resetWhatsAppNotificationSettings,
  } = useMenuStore();

  const [tempMonitorPassword, setTempMonitorPassword] = useState(monitorPassword || 'sanhour123');
  const [showMonitorPassword, setShowMonitorPassword] = useState(false);
  const [monitorPassNotice, setMonitorPassNotice] = useState<string | null>(null);

  // WhatsApp Notification Settings State
  const [tempConfirmTemplate, setTempConfirmTemplate] = useState(whatsappNotificationSettings?.confirmTemplate || defaultConfirmNotificationTemplate);
  const [tempCancelTemplate, setTempCancelTemplate] = useState(whatsappNotificationSettings?.cancelTemplate || defaultCancelNotificationTemplate);
  const [tempSendMode, setTempSendMode] = useState<'manual' | 'auto'>(whatsappNotificationSettings?.sendMode || 'manual');
  const [tempInstanceId, setTempInstanceId] = useState(whatsappNotificationSettings?.instanceId || '');
  const [tempApiToken, setTempApiToken] = useState(whatsappNotificationSettings?.apiToken || '');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiPhone, setTestApiPhone] = useState('');
  const [testApiResult, setTestApiResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [whatsappActiveTab, setWhatsappActiveTab] = useState<'confirm' | 'cancel'>('confirm');
  const [whatsappSaveNotice, setWhatsappSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (monitorPassword) {
      setTempMonitorPassword(monitorPassword);
    }
  }, [monitorPassword]);

  useEffect(() => {
    if (whatsappNotificationSettings) {
      if (whatsappNotificationSettings.confirmTemplate) {
        setTempConfirmTemplate(whatsappNotificationSettings.confirmTemplate);
      }
      if (whatsappNotificationSettings.cancelTemplate) {
        setTempCancelTemplate(whatsappNotificationSettings.cancelTemplate);
      }
      setTempSendMode(whatsappNotificationSettings.sendMode || 'manual');
      setTempInstanceId(whatsappNotificationSettings.instanceId || '');
      setTempApiToken(whatsappNotificationSettings.apiToken || '');
    }
  }, [whatsappNotificationSettings]);

  // Delivery Zones Management State
  const [isDeliveryZonesEditMode, setIsDeliveryZonesEditMode] = useState(false);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<DeliveryZone | null>(null);
  const [zoneNotice, setZoneNotice] = useState<string | null>(null);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');

  const [zoneForm, setZoneForm] = useState({
    name: '',
    fee: 15,
    minOrder: 30,
    estimatedMinutes: '20-30 دقيقة',
  });

  const currentDeliveryZones = (deliveryZones && deliveryZones.length > 0)
    ? deliveryZones
    : defaultZones;

  const showZoneNotice = (msg: string) => {
    setZoneNotice(msg);
    setTimeout(() => setZoneNotice(null), 3000);
  };

  const openAddZoneModal = () => {
    setEditingZone(null);
    setZoneForm({
      name: '',
      fee: 15,
      minOrder: 30,
      estimatedMinutes: '20-30 دقيقة',
    });
    setIsZoneModalOpen(true);
  };

  const openEditZoneModal = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      fee: zone.fee,
      minOrder: zone.minOrder,
      estimatedMinutes: zone.estimatedMinutes,
    });
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = zoneForm.name.trim();
    if (!cleanName) {
      alert('يرجى إدخال اسم المنطقة أو القرية');
      return;
    }
    const feeVal = Number(zoneForm.fee);
    if (isNaN(feeVal) || feeVal < 0) {
      alert('يرجى إدخال رسوم توصيل صالحة');
      return;
    }
    const minVal = Number(zoneForm.minOrder);
    if (isNaN(minVal) || minVal < 0) {
      alert('يرجى إدخال حد أدنى صالح للطلب');
      return;
    }

    if (editingZone) {
      updateDeliveryZone(editingZone.id, {
        name: cleanName,
        fee: feeVal,
        minOrder: minVal,
        estimatedMinutes: zoneForm.estimatedMinutes.trim() || '20-30 دقيقة',
      });
      showZoneNotice(`تم تعديل منطقة "${cleanName}" بنجاح ✅`);
    } else {
      addDeliveryZone({
        name: cleanName,
        fee: feeVal,
        minOrder: minVal,
        estimatedMinutes: zoneForm.estimatedMinutes.trim() || '20-30 دقيقة',
      });
      showZoneNotice(`تمت إضافة منطقة "${cleanName}" بنجاح 🛵`);
    }
    setIsZoneModalOpen(false);
  };

  const filteredZones = useMemo(() => {
    if (!zoneSearchQuery.trim()) return currentDeliveryZones;
    return currentDeliveryZones.filter(z =>
      z.name.toLowerCase().includes(zoneSearchQuery.toLowerCase()) ||
      (z.estimatedMinutes && z.estimatedMinutes.toLowerCase().includes(zoneSearchQuery.toLowerCase()))
    );
  }, [currentDeliveryZones, zoneSearchQuery]);

  // Cart Gift Incentive State (أضف بـ 75 ج.م للحصول على تحلية أو كانز هدية!)
  const activeIncentive = cartIncentiveSettings || defaultCartIncentiveSettings;
  const [incentiveForm, setIncentiveForm] = useState({
    isEnabled: activeIncentive.isEnabled !== false,
    targetAmount: activeIncentive.targetAmount || 75,
    rewardText: activeIncentive.rewardText || 'تحلية أو كانز هدية',
    rewardIcon: activeIncentive.rewardIcon || '🎁',
    preGoalMessage: activeIncentive.preGoalMessage || 'أضف بـ {remaining} ج.م إضافية للحصول على {reward}!',
    postGoalMessage: activeIncentive.postGoalMessage || '🎉 مبروك! حصلت على {reward} مع طلبك!',
    includeInWhatsApp: activeIncentive.includeInWhatsApp !== false,
  });
  const [incentiveNotice, setIncentiveNotice] = useState<string | null>(null);
  const [previewCartAmount, setPreviewCartAmount] = useState<number>(45);

  useEffect(() => {
    if (cartIncentiveSettings) {
      setIncentiveForm({
        isEnabled: cartIncentiveSettings.isEnabled !== false,
        targetAmount: cartIncentiveSettings.targetAmount || 75,
        rewardText: cartIncentiveSettings.rewardText || 'تحلية أو كانز هدية',
        rewardIcon: cartIncentiveSettings.rewardIcon || '🎁',
        preGoalMessage: cartIncentiveSettings.preGoalMessage || 'أضف بـ {remaining} ج.م إضافية للحصول على {reward}!',
        postGoalMessage: cartIncentiveSettings.postGoalMessage || '🎉 مبروك! حصلت على {reward} مع طلبك!',
        includeInWhatsApp: cartIncentiveSettings.includeInWhatsApp !== false,
      });
    }
  }, [cartIncentiveSettings]);

  const showIncentiveNotice = (msg: string) => {
    setIncentiveNotice(msg);
    setTimeout(() => setIncentiveNotice(null), 3000);
  };

  const handleSaveIncentive = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = Number(incentiveForm.targetAmount);
    if (isNaN(target) || target <= 0) {
      alert('يرجى إدخال مبلغ هدف صالح أكبر من صفر');
      return;
    }
    if (!incentiveForm.rewardText.trim()) {
      alert('يرجى إدخال اسم أو وصف الهدية');
      return;
    }
    updateCartIncentiveSettings({
      isEnabled: incentiveForm.isEnabled,
      targetAmount: target,
      rewardText: incentiveForm.rewardText.trim(),
      rewardIcon: incentiveForm.rewardIcon || '🎁',
      preGoalMessage: incentiveForm.preGoalMessage.trim(),
      postGoalMessage: incentiveForm.postGoalMessage.trim(),
      includeInWhatsApp: incentiveForm.includeInWhatsApp,
    });
    showIncentiveNotice('تم حفظ وتحديث إعدادات عرض الهدية في السلة بنجاح ✅');
  };

  // Coupon Management State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [couponFilterStatus, setCouponFilterStatus] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');

  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    maxUses: '' as string | number,
    expiresAt: '',
    minOrderAmount: '' as string | number,
    isActive: true,
    note: '',
  });

  const showCouponNotice = (msg: string) => {
    setCouponNotice(msg);
    setTimeout(() => setCouponNotice(null), 3000);
  };

  const handleCopyCouponCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCouponCode(code);
      setTimeout(() => setCopiedCouponCode(null), 2000);
    }
  };

  const openAddCouponModal = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: '',
      expiresAt: '',
      minOrderAmount: '',
      isActive: true,
      note: '',
    });
    setIsCouponModalOpen(true);
  };

  const openEditCouponModal = (c: Coupon) => {
    setEditingCoupon(c);
    let expLocal = '';
    if (c.expiresAt) {
      const d = new Date(c.expiresAt);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        expLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }

    setCouponForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxUses: c.maxUses !== undefined && c.maxUses !== null ? c.maxUses : '',
      expiresAt: expLocal,
      minOrderAmount: c.minOrderAmount !== undefined && c.minOrderAmount !== null ? c.minOrderAmount : '',
      isActive: c.isActive,
      note: c.note || '',
    });
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponForm.code.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      alert('يرجى إدخال كود الكوبون');
      return;
    }
    const val = Number(couponForm.discountValue);
    if (isNaN(val) || val <= 0) {
      alert('يرجى تحديد قيمة خصم صالحة أكبر من صفر');
      return;
    }
    if (couponForm.discountType === 'percentage' && val > 100) {
      alert('النسبة المئوية للخصم لا يمكن أن تتجاوز 100%');
      return;
    }

    const maxUsesVal = couponForm.maxUses !== '' && Number(couponForm.maxUses) > 0
      ? Math.floor(Number(couponForm.maxUses))
      : null;

    const minOrderVal = couponForm.minOrderAmount !== '' && Number(couponForm.minOrderAmount) > 0
      ? Number(couponForm.minOrderAmount)
      : undefined;

    const expiresAtVal = couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null;

    if (editingCoupon) {
      if (editingCoupon.code.toUpperCase() !== cleanCode) {
        const duplicate = coupons.find(c => c.id !== editingCoupon.id && c.code.toUpperCase() === cleanCode);
        if (duplicate) {
          alert(`الكود "${cleanCode}" مسجل مسبقاً! يرجى اختيار كود آخر.`);
          return;
        }
      }

      updateCoupon(editingCoupon.id, {
        code: cleanCode,
        discountType: couponForm.discountType,
        discountValue: val,
        maxUses: maxUsesVal,
        expiresAt: expiresAtVal,
        minOrderAmount: minOrderVal,
        isActive: couponForm.isActive,
        note: couponForm.note.trim() || undefined,
      });
      showCouponNotice(`تم تعديل الكوبون ${cleanCode} بنجاح ✅`);
    } else {
      const duplicate = coupons.find(c => c.code.toUpperCase() === cleanCode);
      if (duplicate) {
        alert(`الكود "${cleanCode}" مسجل مسبقاً! يرجى اختيار كود آخر.`);
        return;
      }

      addCoupon({
        code: cleanCode,
        discountType: couponForm.discountType,
        discountValue: val,
        maxUses: maxUsesVal,
        expiresAt: expiresAtVal,
        minOrderAmount: minOrderVal,
        isActive: couponForm.isActive,
        note: couponForm.note.trim() || undefined,
      });
      showCouponNotice(`تم إنشاء الكوبون الجديد ${cleanCode} بنجاح 🎉`);
    }
    setIsCouponModalOpen(false);
  };

  const filteredCoupons = useMemo(() => {
    if (!coupons) return [];
    return coupons.filter(c => {
      const matchesSearch = !couponSearchQuery || 
        c.code.toLowerCase().includes(couponSearchQuery.toLowerCase()) || 
        (c.note && c.note.toLowerCase().includes(couponSearchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      const isExpired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
      const isLimitReached = c.maxUses !== undefined && c.maxUses !== null ? (c.usedCount || 0) >= c.maxUses : false;

      if (couponFilterStatus === 'active') {
        return c.isActive && !isExpired && !isLimitReached;
      }
      if (couponFilterStatus === 'expired') {
        return isExpired || isLimitReached;
      }
      if (couponFilterStatus === 'disabled') {
        return !c.isActive;
      }
      return true;
    });
  }, [coupons, couponSearchQuery, couponFilterStatus]);

  const couponStats = useMemo(() => {
    const list = coupons || [];
    const total = list.length;
    const now = Date.now();
    const active = list.filter(c => {
      const isExpired = c.expiresAt ? new Date(c.expiresAt).getTime() < now : false;
      const isLimitReached = c.maxUses !== undefined && c.maxUses !== null ? (c.usedCount || 0) >= c.maxUses : false;
      return c.isActive && !isExpired && !isLimitReached;
    }).length;
    const totalUses = list.reduce((acc, c) => acc + (c.usedCount || 0), 0);
    return { total, active, totalUses };
  }, [coupons]);

  const currentKosharyOptions = (kosharyCustomOptions && kosharyCustomOptions.length > 0)
    ? kosharyCustomOptions
    : defaultKosharyCustomOptions;

  const [newOptionInput, setNewOptionInput] = useState('');
  const [isKosharyOptionsEditMode, setIsKosharyOptionsEditMode] = useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [editingOptionText, setEditingOptionText] = useState('');
  const [optionToDelete, setOptionToDelete] = useState<{ index: number; text: string } | null>(null);
  const [kosharyOptionNotice, setKosharyOptionNotice] = useState<string | null>(null);

  const showKosharyNotice = (msg: string) => {
    setKosharyOptionNotice(msg);
    setTimeout(() => setKosharyOptionNotice(null), 3000);
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin-auth/check');
        const data = await res.json();
        setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const [data, shiftsInfo] = await Promise.all([
        fetchOrdersFromDatabase(),
        fetchShiftsData()
      ]);
      setOrders(data || []);
      if (shiftsInfo) {
        setClosedShifts(shiftsInfo.closedShifts || []);
        setCurrentShiftStartTime(shiftsInfo.currentShiftStartTime || '');
        setCurrentShiftNumber(shiftsInfo.currentShiftNumber || 1);
        setArchivedOrderIds(shiftsInfo.archivedOrderIds || []);
      }
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // مجموعة معرفات الفواتير المؤرشفة للورديات السابقة
  const archivedSet = useMemo(() => new Set(archivedOrderIds.map(String)), [archivedOrderIds]);

  // فواتير الوردية المفتوحة الحالية (المستثنى منها فواتير الورديات السابقة المقفلة)
  const currentShiftOrders = useMemo(() => {
    return orders.filter(o => !archivedSet.has(String(o.id)));
  }, [orders, archivedSet]);

  // إحصائيات وأرقام الوردية الحالية
  const currentShiftStats = useMemo(() => {
    let totalRev = 0, cancelRev = 0, cash = 0, wallet = 0, instapay = 0;
    let confirmedCount = 0, cancelCount = 0, pendingCount = 0, delCount = 0, pickCount = 0;

    currentShiftOrders.forEach(o => {
      const amt = Number(o.total_amount) || 0;
      if (o.status === 'confirmed') {
        confirmedCount++;
        totalRev += amt;
        if (o.payment_method === 'vodafone_cash') wallet += amt;
        else if (o.payment_method === 'instapay') instapay += amt;
        else cash += amt;
      } else if (typeof o.status === 'string' && o.status.startsWith('cancelled')) {
        cancelCount++;
        cancelRev += amt;
      } else {
        pendingCount++;
      }

      if (o.order_type === 'delivery') delCount++;
      else pickCount++;
    });

    return {
      activeOrders: currentShiftOrders,
      totalOrders: currentShiftOrders.length,
      confirmedOrders: confirmedCount,
      cancelledOrders: cancelCount,
      pendingOrders: pendingCount,
      totalRevenue: totalRev,
      totalCancelledRevenue: cancelRev,
      cashAmount: cash,
      walletAmount: wallet,
      instapayAmount: instapay,
      deliveryCount: delCount,
      pickupCount: pickCount,
    };
  }, [currentShiftOrders]);

  // فلترة فواتير الوردية الحالية بالبحث
  const currentShiftFilteredOrders = useMemo(() => {
    if (!currentShiftSearchQuery.trim()) return currentShiftOrders;
    const q = currentShiftSearchQuery.toLowerCase().trim();
    return currentShiftOrders.filter(o => {
      const matchName = o.customer_name?.toLowerCase().includes(q);
      const matchPhone = o.customer_phone?.includes(q);
      const matchId = String(o.id).toLowerCase().includes(q);
      return matchName || matchPhone || matchId;
    });
  }, [currentShiftOrders, currentShiftSearchQuery]);

  // فلترة فواتير الوردية المختارة للعرض في المودال
  const shiftInvoicesFilteredOrders = useMemo(() => {
    if (!selectedShiftForView || !selectedShiftForView.orders) return [];
    let list = selectedShiftForView.orders;

    if (shiftInvoicesStatusFilter === 'confirmed') {
      list = list.filter(o => o.status === 'confirmed');
    } else if (shiftInvoicesStatusFilter === 'cancelled') {
      list = list.filter(o => typeof o.status === 'string' && o.status.startsWith('cancelled'));
    }

    if (shiftInvoicesSearchQuery.trim()) {
      const q = shiftInvoicesSearchQuery.toLowerCase().trim();
      list = list.filter(o => {
        const matchName = o.customer_name?.toLowerCase().includes(q);
        const matchPhone = o.customer_phone?.includes(q);
        const matchId = String(o.id).toLowerCase().includes(q);
        return matchName || matchPhone || matchId;
      });
    }

    return list;
  }, [selectedShiftForView, shiftInvoicesStatusFilter, shiftInvoicesSearchQuery]);

  // فلترة الورديات المقفلة بحسب الفلتر المختار (وردية معينة، اليوم، أسبوع، شهر، ربع سنة، نصف سنة، سنة، أو فترة مخصصة)
  const filteredClosedShifts = useMemo(() => {
    if (closedShifts.length === 0) return [];
    
    // 1. إذا تم اختيار وردية معينة
    if (shiftFilterSpecificShift !== 'all') {
      return closedShifts.filter(s => String(s.shiftNumber) === String(shiftFilterSpecificShift) || String(s.id) === String(shiftFilterSpecificShift));
    }

    if (shiftPeriodFilter === 'all') return closedShifts;

    const now = new Date();

    if (shiftPeriodFilter === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      return closedShifts.filter(s => (s.closedAt || s.openedAt || '').startsWith(todayStr));
    }

    if (shiftPeriodFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return closedShifts.filter(s => new Date(s.closedAt || s.openedAt).getTime() >= weekAgo.getTime());
    }

    if (shiftPeriodFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return closedShifts.filter(s => new Date(s.closedAt || s.openedAt).getTime() >= monthAgo.getTime());
    }

    if (shiftPeriodFilter === 'quarter') {
      // ربع سنة (3 أشهر = 90 يوم)
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return closedShifts.filter(s => new Date(s.closedAt || s.openedAt).getTime() >= quarterAgo.getTime());
    }

    if (shiftPeriodFilter === 'half_year') {
      // نصف سنة (6 أشهر = 182 يوم)
      const halfYearAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
      return closedShifts.filter(s => new Date(s.closedAt || s.openedAt).getTime() >= halfYearAgo.getTime());
    }

    if (shiftPeriodFilter === 'year') {
      // سنة كاملة (365 يوم)
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return closedShifts.filter(s => new Date(s.closedAt || s.openedAt).getTime() >= yearAgo.getTime());
    }

    if (shiftPeriodFilter === 'custom') {
      let list = closedShifts;
      if (shiftCustomStart) {
        const startTimestamp = new Date(shiftCustomStart).setHours(0, 0, 0, 0);
        list = list.filter(s => new Date(s.closedAt || s.openedAt).getTime() >= startTimestamp);
      }
      if (shiftCustomEnd) {
        const endTimestamp = new Date(shiftCustomEnd).setHours(23, 59, 59, 999);
        list = list.filter(s => new Date(s.closedAt || s.openedAt).getTime() <= endTimestamp);
      }
      return list;
    }

    return closedShifts;
  }, [closedShifts, shiftPeriodFilter, shiftFilterSpecificShift, shiftCustomStart, shiftCustomEnd]);

  // إجمالي الإحصائيات التاريخية للورديات المعروضة بعد الفلترة
  const closedShiftsTotalStats = useMemo(() => {
    let totalRev = 0, totalOrdersCount = 0, totalConfirmed = 0;
    filteredClosedShifts.forEach(shift => {
      totalRev += Number(shift.summary?.totalRevenue || 0);
      totalOrdersCount += Number(shift.summary?.totalOrders || shift.orders?.length || 0);
      totalConfirmed += Number(shift.summary?.confirmedOrders || 0);
    });
    return { totalRev, totalOrdersCount, totalConfirmed };
  }, [filteredClosedShifts]);

  // تجميع كل الفواتير المحفوظة في الورديات المقفلة مع معلومات ورديتها للبحث الشامل
  const allClosedShiftsOrdersWithShift = useMemo(() => {
    const map = new Map<string, { order: any; shift: ClosedShift }>();

    // 1. المرور على كل الورديات المقفلة واستخراج فواتيرها
    closedShifts.forEach(shift => {
      if (Array.isArray(shift.orders)) {
        shift.orders.forEach((ord: any) => {
          if (ord && ord.id && !map.has(String(ord.id))) {
            map.set(String(ord.id), { order: ord, shift });
          }
        });
      }

      // إذا كانت أرقام الفواتير مسجلة في الوردية كـ orderIds
      if (Array.isArray(shift.orderIds)) {
        shift.orderIds.forEach((id: string) => {
          if (id && !map.has(String(id))) {
            const matchedInOrders = orders.find(o => String(o.id) === String(id));
            if (matchedInOrders) {
              map.set(String(id), { order: matchedInOrders, shift });
            }
          }
        });
      }
    });

    // 2. أيضاً أي فواتير مؤرشفة تنتمي لـ archivedOrderIds لكن لم تظهر في orders داخل الوردية
    archivedOrderIds.forEach(id => {
      if (id && !map.has(String(id))) {
        const matched = orders.find(o => String(o.id) === String(id));
        if (matched) {
          const matchedShift = closedShifts.find(s => s.orderIds?.includes(String(id)));
          map.set(String(id), {
            order: matched,
            shift: matchedShift || {
              id: 'shift-archived',
              shiftNumber: 1,
              openedAt: matched.created_at,
              closedAt: matched.created_at,
              orderIds: [String(id)],
              orders: [matched],
              summary: {} as any
            }
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.order.created_at || a.shift.closedAt).getTime();
      const timeB = new Date(b.order.created_at || b.shift.closedAt).getTime();
      return timeB - timeA;
    });
  }, [closedShifts, orders, archivedOrderIds]);

  // فلترة نتائج البحث باسم أو رقم هاتف العميل في كل فواتير الورديات المقفلة
  const closedShiftsCustomerSearchResults = useMemo(() => {
    const q = shiftCustomerSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const digitsOnlyQuery = q.replace(/\D/g, '');

    return allClosedShiftsOrdersWithShift.filter(({ order }) => {
      const name = (order.customer_name || '').toLowerCase();
      const phone = (order.customer_phone || '').trim();
      const digitsOnlyPhone = phone.replace(/\D/g, '');
      const orderId = String(order.id).toLowerCase();
      const address = (order.delivery_address || '').toLowerCase();

      const matchName = name.includes(q);
      const matchPhone = phone.includes(q) || (digitsOnlyQuery.length >= 3 && digitsOnlyPhone.includes(digitsOnlyQuery));
      const matchId = orderId.includes(q);
      const matchAddress = address.includes(q);

      return matchName || matchPhone || matchId || matchAddress;
    });
  }, [allClosedShiftsOrdersWithShift, shiftCustomerSearchQuery]);

  // تنفيذ تقفيل الوردية من لوحة الإدارة وتصفير الفواتير فوراً
  const handleAdminConfirmCloseShift = async () => {
    if (currentShiftOrders.length === 0) {
      alert('الوردية الحالية فارغة بالفعل ولا تحتوي على أي فواتير لتقفيلها!');
      return;
    }
    setIsClosingShift(true);
    try {
      const nowIso = new Date().toISOString();
      const newShiftNum = currentShiftNumber + 1;
      const newArchivedIds = [
        ...archivedOrderIds,
        ...currentShiftOrders.map(o => String(o.id))
      ];

      const closedShiftRecord: ClosedShift = {
        id: `shift-${Date.now()}-${currentShiftNumber}`,
        shiftNumber: currentShiftNumber,
        openedAt: currentShiftStartTime || nowIso,
        closedAt: nowIso,
        closedBy: 'لوحة الإدارة',
        orderIds: currentShiftOrders.map(o => String(o.id)),
        orders: JSON.parse(JSON.stringify(currentShiftOrders)),
        summary: {
          totalOrders: currentShiftStats.totalOrders,
          confirmedOrders: currentShiftStats.confirmedOrders,
          cancelledOrders: currentShiftStats.cancelledOrders,
          pendingOrders: currentShiftStats.pendingOrders,
          totalRevenue: currentShiftStats.totalRevenue,
          totalCancelledRevenue: currentShiftStats.totalCancelledRevenue,
          cashAmount: currentShiftStats.cashAmount,
          walletAmount: currentShiftStats.walletAmount,
          instapayAmount: currentShiftStats.instapayAmount,
          deliveryCount: currentShiftStats.deliveryCount,
          pickupCount: currentShiftStats.pickupCount,
        }
      };

      await closeShiftInDatabase(closedShiftRecord, nowIso, newShiftNum, newArchivedIds);

      // تصفير فوري
      setArchivedOrderIds(newArchivedIds);
      setCurrentShiftStartTime(nowIso);
      setCurrentShiftNumber(newShiftNum);
      setClosedShifts(prev => [closedShiftRecord, ...prev]);
      setIsShiftModalOpen(false);

      alert(`تم تقفيل الوردية رقم #${currentShiftNumber} بنجاح وتصفير الفواتير لبدء الوردية #${newShiftNum} 🔒✓`);
    } catch (err: any) {
      console.error('Error closing shift:', err);
      alert('حدث خطأ أثناء تقفيل الوردية: ' + (err.message || err));
    } finally {
      setIsClosingShift(false);
    }
  };

  // طباعة كشف الوردية
  const handlePrintShiftSummary = (shift: ClosedShift) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لإتمام الطباعة');
      return;
    }
    const s = shift.summary || ({} as any);
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير الوردية #${shift.shiftNumber} - كشري لؤلؤة سنهور</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; direction: rtl; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 16px; margin-bottom: 16px; }
          .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 900; }
          .header p { margin: 2px 0; font-size: 13px; color: #64748b; }
          .badge { display: inline-block; padding: 6px 14px; background: #fef3c7; color: #92400e; border-radius: 9999px; font-weight: 900; margin: 10px 0; font-size: 14px; border: 1px solid #fde68a; }
          .section { margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
          .section-title { font-weight: 800; font-size: 14px; margin-bottom: 8px; color: #0f172a; }
          .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
          .row.total { font-size: 16px; font-weight: 900; color: #059669; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>كشري لؤلؤة سنهور 🍲</h1>
          <p>تقرير تقفيل الوردية</p>
          <div class="badge">الوردية رقم #${shift.shiftNumber}</div>
          <p>من: ${formatOrderTime(shift.openedAt)}</p>
          <p>إلى: ${formatOrderTime(shift.closedAt)}</p>
          <p>تم الإغلاق بواسطة: ${shift.closedBy || 'شاشة المتابعة'}</p>
        </div>

        <div class="section">
          <div class="section-title">📊 ملخص الفواتير</div>
          <div class="row"><span>إجمالي الفواتير:</span><span><strong>${s.totalOrders || 0}</strong> فاتورة</span></div>
          <div class="row"><span>الفواتير المؤكدة:</span><span><strong>${s.confirmedOrders || 0}</strong> طلب</span></div>
          <div class="row"><span>الفواتير الملغية:</span><span><strong>${s.cancelledOrders || 0}</strong> طلب</span></div>
          <div class="row"><span>طلبات التوصيل (دليفري):</span><span><strong>${s.deliveryCount || 0}</strong></span></div>
          <div class="row"><span>طلبات الاستلام بالمطعم:</span><span><strong>${s.pickupCount || 0}</strong></span></div>
        </div>

        <div class="section">
          <div class="section-title">💰 تفصيل طرق الدفع</div>
          <div class="row"><span>نقدي (كاش):</span><span><strong>${(s.cashAmount || 0).toLocaleString()}</strong> ج.م</span></div>
          <div class="row"><span>محافظ إلكترونية / فودافون كاش:</span><span><strong>${(s.walletAmount || 0).toLocaleString()}</strong> ج.م</span></div>
          <div class="row"><span>إنستاباي:</span><span><strong>${(s.instapayAmount || 0).toLocaleString()}</strong> ج.م</span></div>
          <div class="row total"><span>صافي المبيعات المحصلة:</span><span>${(s.totalRevenue || 0).toLocaleString()} ج.م</span></div>
          ${s.totalCancelledRevenue ? `<div class="row" style="color: #dc2626; font-size: 12px;"><span>قيمة الطلبات الملغية:</span><span>${s.totalCancelledRevenue.toLocaleString()} ج.م</span></div>` : ''}
        </div>

        <div class="footer">
          <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
          <p>كشري لؤلؤة سنهور - نظام إدارة المطعم</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // طباعة فاتورة مفردة لطلب محدد
  const handlePrintSingleOrder = (order: any, shiftNumber?: number | string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لإتمام الطباعة');
      return;
    }
    const parsed = parseOrderDetails(order.special_notes);
    const itemsToPrint: string[] = (Array.isArray(order.items) && order.items.length > 0)
      ? order.items.map((it: any) => {
          let line = `${it.quantity || 1}x ${it.name || it.item_name || 'صنف'} ${it.total_price || it.price ? `— ${(it.total_price || it.price)} ج.م` : ''}`;
          if (it.customDishDetails) {
            const parts: string[] = [];
            if (it.customDishDetails.base) parts.push(`الأساس: ${it.customDishDetails.base}`);
            if (it.customDishDetails.meat) parts.push(`البروتين: ${it.customDishDetails.meat}`);
            if (it.customDishDetails.spice) parts.push(`الشطة: ${it.customDishDetails.spice}`);
            if (it.customDishDetails.noOptions?.length) parts.push(`بدون: ${it.customDishDetails.noOptions.join('، ')}`);
            if (it.customDishDetails.toppings?.length) parts.push(`الإضافات: ${it.customDishDetails.toppings.join('، ')}`);
            if (parts.length > 0) line += `<br/><small style="color:#64748b; font-size:11px;">[${parts.join(' | ')}]</small>`;
          }
          return line;
        })
      : parsed.items.map((itemStr: string) => {
          const pi = parseItemLine(itemStr);
          if (pi.isCustom || pi.base || pi.protein) {
            const parts: string[] = [];
            if (pi.base) parts.push(`الأساس: ${pi.base}`);
            if (pi.protein) parts.push(`البروتين: ${pi.protein}`);
            if (pi.spice) parts.push(`الشطة: ${pi.spice}`);
            if (pi.without) parts.push(`بدون: ${pi.without}`);
            if (pi.extras) parts.push(`الإضافات: ${pi.extras}`);
            if (pi.notes) parts.push(`ملاحظات: ${pi.notes}`);
            return `${pi.name} × ${pi.quantity} ${pi.price ? `— ${pi.price}` : ''}<br/><small style="color:#64748b; font-size:11px;">[${parts.join(' | ')}]</small>`;
          }
          return itemStr;
        });

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة #${String(order.id).slice(-6)} - كشري لؤلؤة سنهور</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; direction: rtl; color: #0f172a; max-width: 420px; margin: 0 auto; line-height: 1.4; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 12px; }
          .header h1 { margin: 0 0 4px 0; font-size: 18px; font-weight: 900; }
          .header p { margin: 2px 0; font-size: 12px; color: #475569; }
          .badge { display: inline-block; padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 9999px; font-weight: 900; margin: 6px 0; font-size: 12px; border: 1px solid #fde68a; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
          .section-title { font-weight: 800; font-size: 13px; margin: 12px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .item-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; }
          .total-box { margin-top: 12px; padding-top: 8px; border-top: 2px dashed #94a3b8; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .grand-total { font-size: 16px; font-weight: 900; color: #059669; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 4px; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 18px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>كشري لؤلؤة سنهور 🍲</h1>
          <p>فاتورة حساب عميل</p>
          <div class="badge">فاتورة #${String(order.id).slice(-6)} ${shiftNumber ? `(الوردية #${shiftNumber})` : ''}</div>
          <p>التاريخ: ${formatOrderTime(order.created_at || new Date().toISOString())}</p>
          <p>الحالة: ${order.status === 'confirmed' ? 'مؤكد ✅' : (typeof order.status === 'string' && order.status.startsWith('cancelled')) ? 'ملغي 🚫' : 'جديد'}</p>
        </div>

        <div class="info-row"><span>العميل:</span><strong>${order.customer_name || 'بدون اسم'}</strong></div>
        <div class="info-row"><span>الهاتف:</span><strong dir="ltr">${order.customer_phone || '-'}</strong></div>
        <div class="info-row"><span>النوع:</span><strong>${order.delivery_zone || (order.order_type === 'pickup' ? 'استلام من المطعم' : 'توصيل دليفري')}</strong></div>
        ${order.delivery_address ? `<div class="info-row"><span>العنوان:</span><span>${order.delivery_address}</span></div>` : ''}
        ${order.building_notes ? `<div class="info-row"><span>تفاصيل العنوان:</span><span>${order.building_notes}</span></div>` : ''}
        ${parsed.notes ? `<div class="info-row" style="color: #b45309;"><span>ملاحظات العميل:</span><span>${parsed.notes}</span></div>` : ''}

        <div class="section-title">الأصناف والطلبات</div>
        <div>
          ${itemsToPrint.length > 0 ? itemsToPrint.map((it: string) => `<div class="item-row"><span>${it}</span></div>`).join('') : '<p style="color: #94a3b8; font-size: 11px;">تفاصيل الطلب غير مفصلة</p>'}
        </div>

        <div class="total-box">
          ${order.subtotal ? `<div class="total-row"><span>المجموع الفرعي:</span><span>${order.subtotal} ج.م</span></div>` : ''}
          ${order.delivery_fee ? `<div class="total-row"><span>خدمة التوصيل:</span><span>${order.delivery_fee} ج.م</span></div>` : ''}
          ${order.discount_amount ? `<div class="total-row" style="color: #059669;"><span>الخصم ${order.coupon_code ? `(${order.coupon_code})` : ''}:</span><span>-${order.discount_amount} ج.م</span></div>` : ''}
          <div class="total-row grand-total"><span>الإجمالي الصافي:</span><span>${order.total_amount} ج.م</span></div>
          <div class="total-row" style="font-size: 11px; color: #64748b; margin-top: 4px;">
            <span>طريقة الدفع:</span>
            <span>${order.payment_method === 'vodafone_cash' ? 'محفظة فودافون كاش' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش عند الاستلام'}</span>
          </div>
        </div>

        <div class="footer">
          <p>شكراً لتعاملكم معنا - كشري لؤلؤة سنهور 🍲</p>
          <p>خدمة التوصيل: ${defaultInfo.phone}</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'كلمة المرور غير صحيحة');
      }
    } catch {
      setAuthError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin-auth', { method: 'DELETE' });
    setIsAuthenticated(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    await updateOrderStatusInDb(orderId, newStatus);
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));

    // إرسال إشعار الواتساب التلقائي للعميل إذا كانت الإشعارات مفعلة
    const isNotificationEnabled = whatsappNotificationSettings?.isEnabled ?? true;
    const sendMode = whatsappNotificationSettings?.sendMode || 'manual';
    const instanceId = (whatsappNotificationSettings?.instanceId || '').trim();
    const apiToken = (whatsappNotificationSettings?.apiToken || '').trim();

    if (isNotificationEnabled && targetOrder?.customer_phone) {
      let msg = '';
      if (newStatus === 'confirmed') {
        const template = whatsappNotificationSettings?.confirmTemplate || defaultConfirmNotificationTemplate;
        msg = formatWhatsAppNotification(template, targetOrder, { reason: 'تم التأكيد' });
      } else if (typeof newStatus === 'string' && (newStatus.startsWith('cancelled') || newStatus.includes('cancel'))) {
        const reason = newStatus === 'cancelled_not_received' ? 'عدم استلام' : 'إلغاء الطلب';
        const template = whatsappNotificationSettings?.cancelTemplate || defaultCancelNotificationTemplate;
        msg = formatWhatsAppNotification(template, targetOrder, { reason });
      }

      if (msg) {
        if (sendMode === 'auto' && instanceId && apiToken) {
          sendWhatsAppMessageApi(targetOrder.customer_phone, msg, instanceId, apiToken);
        } else {
          openWhatsAppChat(targetOrder.customer_phone, msg);
        }
      }
    }
  };

  const confirmDeleteOrder = async (orderId: string) => {
    await deleteOrderFromDatabase(orderId);
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setOrderToDelete(null);
    setDeleteNotice('تم حذف الطلب بنجاح من السجل');
    setTimeout(() => setDeleteNotice(null), 3000);
  };


  const updateZoneFee = (zoneId: string, newFee: number) => {
    if (isNaN(newFee) || newFee < 0) return;
    updateDeliveryZone(zoneId, { fee: newFee });
    showSaveIndicator();
  };

  const showSaveIndicator = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter(o => {
      // 1. Time filter
      if (timeFilter !== 'all') {
        const orderDate = new Date(o.created_at || Date.now());

        if (timeFilter === 'today') {
          const isToday =
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getDate() === now.getDate();
          if (!isToday) return false;
        } else if (timeFilter === 'week') {
          const diffMs = now.getTime() - orderDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 7) return false;
        } else if (timeFilter === 'month') {
          const isThisMonth =
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth();
          if (!isThisMonth) return false;
        } else if (timeFilter === 'year') {
          const isThisYear = orderDate.getFullYear() === now.getFullYear();
          if (!isThisYear) return false;
        } else if (timeFilter === 'custom') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (orderDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (orderDate > end) return false;
          }
        }
      }

      // 2. Name & Phone search
      if (customerSearchQuery.trim()) {
        const q = customerSearchQuery.toLowerCase().trim();
        const matchName = o.customer_name?.toLowerCase().includes(q);
        const matchPhone = o.customer_phone?.includes(q);
        const matchId = String(o.id).toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId) return false;
      }

      return true;
    });
  }, [orders, timeFilter, customStartDate, customEndDate, customerSearchQuery]);

  // 1. إجمالي المبيعات والأرباح للطلبات المؤكدة فقط (التي تم الضغط على زر تأكيد لها ولم تُلغَ)
  const confirmedOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'confirmed');
  }, [filteredOrders]);

  const confirmedRevenue = useMemo(() => {
    return confirmedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [confirmedOrders]);

  const uniqueConfirmedCustomerCount = useMemo(() => {
    const set = new Set(
      confirmedOrders.map(o => (o.customer_phone || o.customer_name || '').trim()).filter(Boolean)
    );
    return set.size;
  }, [confirmedOrders]);

  // 2. الطلبات الملغية وإجمالي مبالغها
  const cancelledOrders = useMemo(() => {
    return filteredOrders.filter(o =>
      o.status === 'cancelled_not_received' ||
      o.status === 'cancelled_before_dispatch' ||
      o.status === 'cancelled' ||
      (typeof o.status === 'string' && o.status.startsWith('cancelled'))
    );
  }, [filteredOrders]);

  const cancelledRevenue = useMemo(() => {
    return cancelledOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [cancelledOrders]);

  // الإجماليات العامة لكامل نتائج الفلتر
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [filteredOrders]);

  const uniqueCustomerCount = useMemo(() => {
    const set = new Set(
      filteredOrders.map(o => (o.customer_phone || o.customer_name || '').trim()).filter(Boolean)
    );
    return set.size;
  }, [filteredOrders]);

  const activePeriodLabel = useMemo(() => {
    switch (timeFilter) {
      case 'today': return 'اليوم';
      case 'week': return 'هذا الأسبوع';
      case 'month': return 'هذا الشهر';
      case 'year': return 'هذه السنة';
      case 'custom':
        if (customStartDate && customEndDate) return `من ${customStartDate} إلى ${customEndDate}`;
        if (customStartDate) return `من ${customStartDate}`;
        if (customEndDate) return `حتى ${customEndDate}`;
        return 'فترة مخصصة';
      default: return 'كل الأوقات';
    }
  }, [timeFilter, customStartDate, customEndDate]);

  // إحصائيات الشهور للسنة الحالية للتقرير السنوي
  const monthlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const stats = monthNames.map((name, index) => ({
      monthIndex: index,
      name,
      orderCount: 0,
      confirmedCount: 0,
      confirmedRevenue: 0,
      cancelledRevenue: 0,
    }));

    orders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        if (stats[m]) {
          stats[m].orderCount += 1;
          if (o.status === 'confirmed') {
            stats[m].confirmedCount += 1;
            stats[m].confirmedRevenue += Number(o.total_amount) || 0;
          } else if (typeof o.status === 'string' && o.status.startsWith('cancelled')) {
            stats[m].cancelledRevenue += Number(o.total_amount) || 0;
          }
        }
      }
    });

    return stats;
  }, [orders]);

  // إحصائيات طرق الدفع للتقرير
  const paymentMethodStats = useMemo(() => {
    let cash = 0, wallet = 0, instapay = 0;
    confirmedOrders.forEach(o => {
      const amt = Number(o.total_amount) || 0;
      if (o.payment_method === 'vodafone_cash') wallet += amt;
      else if (o.payment_method === 'instapay') instapay += amt;
      else cash += amt;
    });
    return { cash, wallet, instapay };
  }, [confirmedOrders]);

  // إحصائيات التوصيل والاستلام للتقرير
  const orderTypeStats = useMemo(() => {
    let delivery = 0, pickup = 0;
    confirmedOrders.forEach(o => {
      if (o.order_type === 'delivery') delivery += 1;
      else pickup += 1;
    });
    return { delivery, pickup };
  }, [confirmedOrders]);

  const formatOrderTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
          <span className="text-sm font-bold text-slate-300">جار التحقق من الصلاحيات وأمان البوابة...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-rose-600 selection:text-white">
        <div className="absolute w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto rounded-full p-1.5 bg-gradient-to-tr from-[#dc0b07] via-amber-400 to-[#dc0b07] shadow-xl flex items-center justify-center">
            <div className="relative w-full h-full rounded-full bg-[#dc0b07] border-2 border-white/40 overflow-hidden flex items-center justify-center shadow-inner">
              <Image src="/logo-transparent.png" alt="لؤلؤة سنهور" fill className="object-contain p-2" priority />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>بوابة الإدارة المشفرة والمحمية</span>
            </div>
            <h1 className="text-2xl font-black text-white">لوحة تحكم مطعم لؤلؤة سنهور</h1>
            <p className="text-xs text-slate-400 mt-1">أدخل رمز المرور السري الخاص بالإدارة لمتابعة الطلبات وتعديل الأسعار</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">رمز الدخول السري (Master Password)</label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full py-3.5 px-4 pr-11 rounded-2xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm font-bold transition"
                  autoFocus
                />
                <Lock className="absolute top-3.5 right-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>
            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-right">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جار التحقق المشفر...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول الآمن</span>
                </>
              )}
            </button>
          </form>
          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
            <Link
              href="/admin/monitor"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-amber-400 hover:text-amber-300 font-bold text-xs border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🖥️</span>
              <span>بوابة شاشة متابعة الطلبات (المطبخ والصالة)</span>
            </Link>
            <Link href="/" className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium">
              <span>العودة لصفحة الزوار والقائمة</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-600 selection:text-white pb-20">
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-[0.5px] border-white/30 bg-[#dc0b07] p-0.5 flex items-center justify-center shrink-0 shadow-sm">
              <Image src="/logo-transparent.png" alt="لؤلؤة سنهور" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-white">إدارة لؤلؤة سنهور 👑</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>متصل</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">لوحة التحكم المباشرة بالطلبات، المنيو، والإعدادات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/monitor"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow-xs"
              title="فتح شاشة متابعة وتنفيذ الطلبات"
            >
              <span>🖥️</span>
              <span className="hidden sm:inline">شاشة المتابعة</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link href="/" target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">معاينة المتجر</span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs between Orders, Menu Management, Coupons & Settings */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-4xl">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>الطلبات والمبيعات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>المنيو والأصناف</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`flex-1 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer relative ${
              activeTab === 'coupons'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-400" />
            <span>الكوبونات والخصم</span>
            {coupons && coupons.length > 0 && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {coupons.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات المتجر</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {activeTab === 'menu' && <MenuManagementTab />}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* شريط التنقل بين التبويبات الفرعية الثلاثة للطلبات والمبيعات */}
            <div className="bg-slate-900/95 border border-slate-800 p-2 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                
                {/* 1. تبويبة الوردية الحالية */}
                <button
                  type="button"
                  onClick={() => setOrdersSubTab('current_shift')}
                  className={`flex-1 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    ordersSubTab === 'current_shift'
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${ordersSubTab === 'current_shift' ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
                  <span>الوردية الحالية</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    ordersSubTab === 'current_shift' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    #{currentShiftNumber} ({currentShiftOrders.length})
                  </span>
                </button>

                {/* 2. تبويبة فواتير الورديات */}
                <button
                  type="button"
                  onClick={() => setOrdersSubTab('shifts_history')}
                  className={`flex-1 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    ordersSubTab === 'shifts_history'
                      ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>فواتير الورديات</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    ordersSubTab === 'shifts_history' ? 'bg-amber-800 text-amber-100' : 'bg-slate-800 text-amber-400 border border-amber-500/20'
                  }`}>
                    {closedShifts.length} وردية
                  </span>
                </button>

                {/* 3. تبويبة التقرير الشهري والسنوي */}
                <button
                  type="button"
                  onClick={() => setOrdersSubTab('reports')}
                  className={`flex-1 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    ordersSubTab === 'reports'
                      ? 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>التقرير الشهري والسنوي</span>
                </button>

              </div>

              {/* رابط سريع لشاشة متابعة الطلبات المباشرة */}
              <Link
                href="/admin/monitor"
                target="_blank"
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-black border border-slate-700/80 transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>شاشة المتابعة الكبيرة 🖥️</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* ========================================================================= */}
            {/* التبويبة الأولى: 🟢 الوردية الحالية */}
            {/* ========================================================================= */}
            {ordersSubTab === 'current_shift' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* كارت إدارة الوردية الحالية وزر تقفيل الوردية */}
                <div className="bg-gradient-to-br from-slate-900 via-[#0c1f2d] to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 font-black">
                        <Lock className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-black text-white">الوردية الحالية رقم #{currentShiftNumber}</h3>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>مفتوحة وتستقبل الطلبات</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>بدأت الوردية في: {currentShiftStartTime ? formatOrderTime(currentShiftStartTime) : 'بداية اليوم'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                      {/* زر تقفيل الوردية الحالية وتصفير الفواتير */}
                      <button
                        type="button"
                        onClick={() => setIsShiftModalOpen(true)}
                        className="flex-1 lg:flex-none py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-amber-400"
                        title={`تقفيل الوردية الحالية (#${currentShiftNumber}) وتصفير الفواتير لبدء وردية جديدة`}
                      >
                        <Lock className="w-4 h-4 text-slate-950" />
                        <span>تقفيل الوردية #{currentShiftNumber} وتصفير الفواتير 🔒</span>
                      </button>

                      <button
                        onClick={loadOrders}
                        className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="تحديث فوري للفواتير"
                      >
                        <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                        <span>تحديث</span>
                      </button>
                    </div>
                  </div>

                  {/* إحصائيات الوردية المفتوحة الحالية */}
                  <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-1">
                      <span className="text-slate-400 text-xs font-bold block">فواتير الوردية الحالية</span>
                      <div className="text-2xl font-black text-amber-400 font-mono">{currentShiftStats.totalOrders} <span className="text-xs text-slate-400 font-medium">فاتورة</span></div>
                      <span className="text-[11px] text-slate-500 block font-bold">{currentShiftStats.pendingOrders} بانتظار التأكيد</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                      <span className="text-emerald-300 text-xs font-bold block">المبيعات المؤكدة (الصافي)</span>
                      <div className="text-2xl font-black text-emerald-400 font-mono">{currentShiftStats.totalRevenue.toLocaleString()} <span className="text-xs text-emerald-300 font-medium">ج.م</span></div>
                      <span className="text-[11px] text-emerald-400/80 block font-bold">{currentShiftStats.confirmedOrders} طلب مؤكد</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-1">
                      <span className="text-slate-400 text-xs font-bold block">تفصيل طرق الدفع</span>
                      <div className="text-xs text-slate-300 font-bold space-y-0.5">
                        <div className="flex justify-between"><span>كاش:</span><span className="text-emerald-400 font-mono">{currentShiftStats.cashAmount.toLocaleString()} ج</span></div>
                        <div className="flex justify-between"><span>محافظ:</span><span className="text-amber-400 font-mono">{currentShiftStats.walletAmount.toLocaleString()} ج</span></div>
                        <div className="flex justify-between"><span>إنستاباي:</span><span className="text-cyan-400 font-mono">{currentShiftStats.instapayAmount.toLocaleString()} ج</span></div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                      <span className="text-rose-300 text-xs font-bold block">فواتير ملغية</span>
                      <div className="text-2xl font-black text-rose-400 font-mono">{currentShiftStats.cancelledOrders} <span className="text-xs text-rose-300 font-medium">طلب</span></div>
                      <span className="text-[11px] text-rose-400/80 block font-bold">{currentShiftStats.totalCancelledRevenue.toLocaleString()} ج.م ملغية</span>
                    </div>
                  </div>
                </div>

                {/* شريط البحث في فواتير الوردية الحالية */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="relative w-full sm:w-96">
                    <input
                      type="text"
                      value={currentShiftSearchQuery}
                      onChange={(e) => setCurrentShiftSearchQuery(e.target.value)}
                      placeholder="بحث في فواتير الوردية بالاسم أو الهاتف..."
                      className="w-full py-2.5 px-4 pr-10 pl-8 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="absolute top-3 right-3.5 w-4 h-4 text-slate-400" />
                    {currentShiftSearchQuery && (
                      <button
                        onClick={() => setCurrentShiftSearchQuery('')}
                        className="absolute top-2.5 left-3 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 font-bold">
                    فواتير الوردية الحالية المعروضة: <span className="text-emerald-400 font-black">{currentShiftFilteredOrders.length}</span> فاتورة
                  </div>
                </div>

                {/* قائمة فواتير الوردية الحالية */}
                {currentShiftFilteredOrders.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-white">الوردية الحالية رقم #{currentShiftNumber} جاهزة ونظيفة 🟢</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {currentShiftOrders.length === 0
                        ? 'تم تصفير الفواتير بنجاح، وستظهر أي طلبات جديدة يقوم الزبائن بطلبها هنا فوراً. يمكنك الرجوع لجميع الفواتير السابقة في تبويبة (فواتير الورديات).'
                        : 'لا توجد فواتير تطابق نص البحث الحالي في هذه الوردية.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentShiftFilteredOrders.map(order => (
                      <div key={order.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition space-y-4 shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              #{String(order.id).slice(-6)}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-black text-white">{order.customer_name}</h4>
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderForDetails(order)}
                                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                                  title="عرض تفاصيل الفاتورة كاملة"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-950" />
                                  <span>تفاصيل 🔍</span>
                                </button>
                                {order.status === 'confirmed' ? (
                                  <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>مؤكد</span>
                                  </span>
                                ) : order.status === 'cancelled_not_received' ? (
                                  <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-400" />
                                    <span>ملغي (عدم استلام)</span>
                                  </span>
                                ) : order.status === 'cancelled_before_dispatch' ? (
                                  <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-amber-400" />
                                    <span>ملغي قبل الخروج</span>
                                  </span>
                                ) : (
                                  <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-sky-400" />
                                    <span>جديد (بانتظار التأكيد)</span>
                                  </span>
                                )}
                                {order.created_at && (
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatOrderTime(order.created_at)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800 font-mono dir-ltr">
                                  <Phone className="w-3 h-3 text-emerald-400" />
                                  <span>{order.customer_phone}</span>
                                </span>
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                  {order.order_type === 'takeaway' || order.delivery_zone === 'استلام من المطعم' || !order.delivery_zone || order.delivery_zone === 'غير محدد'
                                    ? '🏬 استلام تيك أواي من المحل'
                                    : `🛵 دليفري: ${order.delivery_zone}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* زر حذف الطلب */}
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/80 transition cursor-pointer text-xs font-bold shrink-0"
                            title="حذف هذا الطلب من السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الطلب</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                            <span className="text-slate-500 block font-bold">العنوان بالتفصيل:</span>
                            <p className="text-slate-200 font-medium">{order.delivery_address || 'استلام من المطعم'}</p>
                            {order.building_notes && <span className="text-[11px] text-amber-400/80 block">ملاحظات: {order.building_notes}</span>}
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                            <span className="text-slate-500 block font-bold">الدفع والإجمالي:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-rose-400 font-mono">{order.total_amount} ج.م</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                {order.payment_method === 'vodafone_cash' ? 'محفظة كاش' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش عند الاستلام'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block">عدد الأصناف: {order.items_count} | توصيل: {order.delivery_fee} ج.م</span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-around gap-2">
                            <a href={`tel:${order.customer_phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>اتصال</span>
                            </a>
                            <a href={`https://wa.me/2${(order.customer_phone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold transition text-xs">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>واتساب</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* ========================================================================= */}
            {/* التبويبة الثانية: 📋 فواتير الورديات (أرشيف الورديات المقفلة) */}
            {/* ========================================================================= */}
            {ordersSubTab === 'shifts_history' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* بانر إجمالي الورديات المقفلة */}
                <div className="bg-gradient-to-br from-slate-900 via-[#1e170c] to-slate-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                        <History className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">سجل فواتير الورديات المقفلة</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          أرشيف دائم بجميع الفواتير والمبالغ لكل وردية تم تقفيلها مع إمكانية عرض الفواتير وطباعتها
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={loadOrders}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                      <span>تحديث الأرشيف</span>
                    </button>
                  </div>

                  {/* إحصائيات عامة عن كل الورديات المقفلة */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <span className="text-xs text-slate-400 font-bold block">إجمالي الورديات المقفلة</span>
                      <div className="text-2xl font-black text-amber-400 font-mono mt-1">{closedShifts.length} <span className="text-xs text-slate-400 font-medium">وردية</span></div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                      <span className="text-xs text-emerald-300 font-bold block">إجمالي الإيراد المحصل بالورديات</span>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{closedShiftsTotalStats.totalRev.toLocaleString()} <span className="text-xs text-emerald-300 font-medium">ج.م</span></div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <span className="text-xs text-slate-400 font-bold block">إجمالي الفواتير المؤرشفة</span>
                      <div className="text-2xl font-black text-white font-mono mt-1">{closedShiftsTotalStats.totalOrdersCount} <span className="text-xs text-slate-400 font-medium">فاتورة</span></div>
                    </div>
                  </div>
                </div>

                {/* شريط اختيار أسلوب العرض والبحث: بالوردية والفترات أو باسم ورقم هاتف العميل */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-md font-sans">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-200">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>طريقة البحث في أرشيف الورديات:</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShiftSearchMode('by_shift')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                        shiftSearchMode === 'by_shift'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>تصفية بالوردية والفترات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShiftSearchMode('by_customer')}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                        shiftSearchMode === 'by_customer'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>بحث باسم أو رقم هاتف العميل</span>
                    </button>
                  </div>
                </div>

                {shiftSearchMode === 'by_shift' ? (
                  <>
                    {/* وحدة فلترة فواتير الورديات: بالوردية أو الفترة (اليوم، أسبوع، شهر، ربع سنة، نصف سنة، سنة، أو مخصص) */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg font-sans">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>تصفية الورديات حسب الفترة الزمنية:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                      {[
                        { id: 'all', label: 'كل الورديات' },
                        { id: 'today', label: 'اليوم' },
                        { id: 'week', label: 'هذا الأسبوع' },
                        { id: 'month', label: 'هذا الشهر' },
                        { id: 'quarter', label: 'ربع سنة (3 أشهر)' },
                        { id: 'half_year', label: 'نصف سنة (6 أشهر)' },
                        { id: 'year', label: 'سنة كاملة' },
                        { id: 'custom', label: '📅 فترة محددة' }
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => {
                            setShiftPeriodFilter(btn.id as any);
                            if (btn.id !== 'all') setShiftFilterSpecificShift('all');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            shiftPeriodFilter === btn.id && shiftFilterSpecificShift === 'all'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/70'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* السطر الثاني: اختيار وردية معينة بالرقم وتحديد فترة مخصصة بالتواريخ */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    {/* فلتر اختيار وردية معينة */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap">اختيار وردية معينة:</span>
                      <select
                        value={shiftFilterSpecificShift}
                        onChange={(e) => {
                          setShiftFilterSpecificShift(e.target.value);
                          if (e.target.value !== 'all') setShiftPeriodFilter('specific');
                          else setShiftPeriodFilter('all');
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="all">جميع أرقام الورديات ({closedShifts.length})</option>
                        {closedShifts.map((s, idx) => (
                          <option key={s.id || idx} value={String(s.shiftNumber)}>
                            الوردية رقم #{s.shiftNumber} ({formatOrderTime(s.closedAt)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* نتائج الفلترة */}
                    <div className="text-xs text-slate-400 font-bold bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
                      <span>الورديات المعروضة:</span>
                      <span className="text-amber-400 font-black">{filteredClosedShifts.length} من أصل {closedShifts.length} وردية</span>
                    </div>
                  </div>

                  {/* إذا تم اختيار فترة مخصصة بالتواريخ */}
                  {shiftPeriodFilter === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 animate-in fade-in">
                      <span className="text-xs font-bold text-amber-400">تحديد الفترة باليوم:</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">من:</label>
                        <input
                          type="date"
                          value={shiftCustomStart}
                          onChange={(e) => setShiftCustomStart(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">إلى:</label>
                        <input
                          type="date"
                          value={shiftCustomEnd}
                          onChange={(e) => setShiftCustomEnd(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      {(shiftCustomStart || shiftCustomEnd) && (
                        <button
                          type="button"
                          onClick={() => { setShiftCustomStart(''); setShiftCustomEnd(''); }}
                          className="text-xs text-amber-400 hover:underline font-bold"
                        >
                          إعادة الضبط
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* قائمة كروت الورديات المقفلة */}
                {filteredClosedShifts.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3 font-sans">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                      <History className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-white">لا توجد ورديات مطابقة لخيارات الفلترة المحددة</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      جرب اختيار فترة زمنية أخرى أو إعادة ضبط الفلتر لعرض كل الورديات المقفلة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans">
                    {filteredClosedShifts.map((shift, idx) => {
                      const s = shift.summary || ({} as any);
                      const ordersCount = shift.orders?.length || shift.orderIds?.length || s.totalOrders || 0;
                      return (
                        <div
                          key={shift.id || idx}
                          className="bg-slate-900/85 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 transition-all duration-300 space-y-4 shadow-xl relative overflow-hidden group font-sans"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm font-black">
                                الوردية #{shift.shiftNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black text-slate-200">
                                    من: {formatOrderTime(shift.openedAt)}
                                  </span>
                                  <span className="text-slate-500">←</span>
                                  <span className="text-xs font-black text-amber-400">
                                    إلى: {formatOrderTime(shift.closedAt)}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  أغلقت بواسطة: {shift.closedBy || 'شاشة المتابعة'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {/* زر استعراض فواتير الوردية بالتفصيل */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedShiftForView(shift);
                                  setShiftInvoicesSearchQuery('');
                                  setShiftInvoicesStatusFilter('all');
                                }}
                                className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Eye className="w-4 h-4" />
                                <span>عرض فواتير الوردية ({ordersCount}) 🧾</span>
                              </button>

                              {/* زر طباعة تقرير الوردية */}
                              <button
                                type="button"
                                onClick={() => handlePrintShiftSummary(shift)}
                                className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                title="طباعة كشف الوردية"
                              >
                                <Printer className="w-4 h-4" />
                                <span>طباعة 🖨️</span>
                              </button>
                            </div>
                          </div>

                          {/* شبكة الأرقام والإحصائيات للوردية (5 كروت منظمة بخط البرنامج الأصلي) */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                            {/* 1. إجمالي الفواتير مع تكبير رقم المؤكد */}
                            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                              <span className="text-slate-400 font-bold block">إجمالي الفواتير:</span>
                              <div className="my-1">
                                <span className="text-xl sm:text-2xl font-black text-white block">{ordersCount} فاتورة</span>
                              </div>
                              <div className="mt-1 pt-1.5 border-t border-slate-800/80">
                                <span className="text-sm font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/20 inline-block">
                                  {s.confirmedOrders || 0} مؤكد ✅
                                </span>
                              </div>
                            </div>

                            {/* 2. صافي التحصيل المؤكد */}
                            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex flex-col justify-between">
                              <span className="text-emerald-300 font-bold block">صافي التحصيل المؤكد:</span>
                              <div className="my-1">
                                <span className="text-xl sm:text-2xl font-black text-emerald-400 block">{(s.totalRevenue || 0).toLocaleString()} ج.م</span>
                              </div>
                              <span className="text-[11px] text-emerald-400/80 font-bold">مبيعات الطلبات المؤكدة</span>
                            </div>

                            {/* 3. طرق الدفع المحصلة */}
                            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                              <span className="text-slate-400 font-bold block">طرق الدفع المحصلة:</span>
                              <div className="text-xs text-slate-300 font-bold space-y-1 mt-1">
                                <div className="flex justify-between items-center">
                                  <span>كاش:</span>
                                  <span className="text-emerald-400 font-bold">{(s.cashAmount || 0).toLocaleString()} ج</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>محافظ:</span>
                                  <span className="text-amber-400 font-bold">{(s.walletAmount || 0).toLocaleString()} ج</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>إنستاباي:</span>
                                  <span className="text-cyan-400 font-bold">{(s.instapayAmount || 0).toLocaleString()} ج</span>
                                </div>
                              </div>
                            </div>

                            {/* 4. كارت مستقل: نوع الطلبات (دليفري واستلام من الفرع) */}
                            <div className="p-3.5 rounded-2xl bg-sky-950/25 border border-sky-500/25 flex flex-col justify-between">
                              <span className="text-sky-300 font-bold block">🛵 نوع الطلبات:</span>
                              <div className="space-y-1.5 my-1">
                                <div className="flex justify-between items-center text-xs font-bold text-sky-400">
                                  <span>دليفري:</span>
                                  <span className="text-sm font-black">{s.deliveryCount || 0} طلب</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-purple-400">
                                  <span>استلام من الفرع:</span>
                                  <span className="text-sm font-black">{s.pickupCount || 0} طلب</span>
                                </div>
                              </div>
                              <span className="text-[10.5px] text-slate-400 block pt-1 border-t border-sky-500/20">توزيع حركة التوصيل والصالة</span>
                            </div>

                            {/* 5. كارت مستقل: الفواتير الملغية */}
                            <div className="p-3.5 rounded-2xl bg-rose-950/25 border border-rose-500/25 col-span-2 sm:col-span-1 flex flex-col justify-between">
                              <span className="text-rose-300 font-bold block">🚫 الفواتير الملغية:</span>
                              <div className="my-1">
                                <span className="text-xl sm:text-2xl font-black text-rose-400 block">{s.cancelledOrders || 0} طلب ملغي</span>
                              </div>
                              <span className="text-xs font-bold text-rose-300/80 block">
                                مبلغ: {(s.totalCancelledRevenue || 0).toLocaleString()} ج.م
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
                  </>
                ) : (
                  <div className="space-y-4 font-sans animate-in fade-in duration-200">
                    {/* مستطيل البحث الشامل باسم العميل أو رقم الهاتف */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                          <Search className="w-4 h-4 text-amber-400" />
                          <span>البحث المباشر في فواتير كل الورديات المقفلة:</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                          الأرشيف المحفوظ: {allClosedShiftsOrdersWithShift.length} فاتورة مسجلة
                        </span>
                      </div>

                      {/* مستطيل الإدخال المخصص */}
                      <div className="relative">
                        <input
                          type="text"
                          value={shiftCustomerSearchQuery}
                          onChange={(e) => setShiftCustomerSearchQuery(e.target.value)}
                          placeholder="اكتب اسم العميل أو رقم الهاتف للبحث في جميع الفواتير المحفوظة..."
                          className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-amber-500 text-white rounded-2xl py-3.5 pr-12 pl-12 text-sm font-bold placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                          autoFocus
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400 pointer-events-none">
                          <Search className="w-5 h-5 text-amber-400" />
                        </div>
                        {shiftCustomerSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setShiftCustomerSearchQuery('')}
                            className="absolute top-1/2 -translate-y-1/2 left-3.5 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="مسح البحث"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400 font-bold">
                        <span>
                          يبحث في اسم العميل، أو رقم الهاتف، أو رقم الفاتورة عبر جميع الورديات التي تم تقفيلها.
                        </span>
                        {shiftCustomerSearchQuery.trim() && (
                          <span className="text-amber-400 font-black">
                            تم العثور على {closedShiftsCustomerSearchResults.length} فاتورة مطابقة
                          </span>
                        )}
                      </div>
                    </div>

                    {/* نتائج البحث */}
                    {!shiftCustomerSearchQuery.trim() ? (
                      <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3 font-sans">
                        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                          <Search className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-white">ابحث برقم الهاتف أو اسم العميل</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                          اكتب في المستطيل أعلاه اسم العميل أو رقم هاتفه، وسيتم البحث الفوري في جميع فواتير الورديات السابقة التي تم تقفيلها وحفظها على السيرفر.
                        </p>
                      </div>
                    ) : closedShiftsCustomerSearchResults.length === 0 ? (
                      <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3 font-sans">
                        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
                          <XCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-white">
                          لا توجد فواتير مطابقة لـ &ldquo;{shiftCustomerSearchQuery}&rdquo;
                        </h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                          لم يتم العثور على أي فواتير مسجلة بهذا الاسم أو الرقم داخل الورديات المقفلة.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 font-sans">
                        {closedShiftsCustomerSearchResults.map(({ order, shift }, idx) => {
                          const isCancelled = typeof order.status === 'string' && order.status.startsWith('cancelled');
                          const isConfirmed = order.status === 'confirmed';
                          const parsedOrder = parseOrderDetails(order.special_notes);
                          const itemsList = (Array.isArray(order.items) && order.items.length > 0)
                            ? order.items
                            : parsedOrder.items;

                          return (
                            <div
                              key={order.id || idx}
                              className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition space-y-3 shadow-md"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-mono text-base font-black text-amber-400">
                                    #{String(order.id).slice(-6)}
                                  </span>
                                  
                                  {/* شارة الوردية */}
                                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <History className="w-3.5 h-3.5 text-amber-400" />
                                    <span>الوردية #{shift.shiftNumber}</span>
                                  </span>

                                  {isConfirmed ? (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>مؤكد ✅</span>
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                      <span>ملغي 🚫</span>
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                      قيد الانتظار ⏳
                                    </span>
                                  )}

                                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{formatOrderTime(order.created_at)}</span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* زر تفاصيل الفاتورة */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrderShiftNumber(shift.shiftNumber);
                                      setSelectedOrderForDetails(order);
                                    }}
                                    className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>تفاصيل الفاتورة 🧾</span>
                                  </button>

                                  {/* زر طباعة الفاتورة */}
                                  <button
                                    type="button"
                                    onClick={() => handlePrintSingleOrder(order, shift.shiftNumber)}
                                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                    title="طباعة الفاتورة"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>طباعة 🖨️</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-white text-sm">{order.customer_name}</span>
                                  <span className="text-slate-400 font-bold">{order.customer_phone}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-black text-emerald-400">
                                    {Number(order.total_amount || 0).toLocaleString()} ج.م
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                    {order.payment_method === 'vodafone_cash' ? 'محفظة كاش' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش'}
                                  </span>
                                </div>
                              </div>

                              {/* أصناف الفاتورة إن وجدت */}
                              {Array.isArray(itemsList) && itemsList.length > 0 && (
                                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs">
                                  <span className="text-[10.5px] text-slate-400 font-bold block mb-1">محتويات الفاتورة:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {itemsList.map((it: any, itIdx: number) => {
                                      const itemName = typeof it === 'string'
                                        ? parseItemLine(it).name
                                        : (it.name || it.item_name || 'صنف');
                                      const qty = typeof it === 'string'
                                        ? parseItemLine(it).quantity
                                        : (it.quantity || 1);
                                      return (
                                        <span key={itIdx} className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-bold border border-slate-700/80">
                                          {qty}× {itemName}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{order.delivery_address || (order.order_type === 'delivery' ? 'توصيل دليفري' : 'استلام من المطعم')}</span>
                                  {order.building_notes && <span className="text-amber-400/80">({order.building_notes})</span>}
                                </div>

                                <div className="flex items-center gap-2">
                                  <a
                                    href={`tel:${order.customer_phone}`}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-400" />
                                    <span>اتصال</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/2${(order.customer_phone || '').replace(/^0/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 transition flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>واتساب</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ========================================================================= */}
            {/* التبويبة الثالثة: 📊 التقرير الشهري والسنوي (التحليلات الشاملة) */}
            {/* ========================================================================= */}
            {ordersSubTab === 'reports' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* المربعات الإحصائية العلوية الشاملة */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* المربع الأول: إجمالي المبيعات المؤكدة */}
                  <div className="group rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-teal-950/80 hover:border-emerald-400 hover:shadow-emerald-500/10">
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-teal-500/10 text-emerald-300 flex items-center justify-center border border-emerald-400/30 shadow-lg shadow-emerald-500/20">
                          <DollarSign className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                          <span className="text-sm sm:text-base font-black text-white block tracking-wide">إجمالي المبيعات (المؤكدة)</span>
                          <span className="text-[11px] text-emerald-200/70 font-bold">الفترة: {activePeriodLabel}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>صافي التحصيل المؤكد</span>
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-3 relative z-10">
                      <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-emerald-300 tracking-tight drop-shadow-sm font-mono">
                        {confirmedRevenue.toLocaleString('ar-EG')}
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-400">جنيه مصري</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-emerald-200/70 font-medium pt-3.5 border-t border-emerald-500/20 relative z-10">
                      <span className="flex items-center gap-1.5">
                        <span>💰</span>
                        <span>قيمة الطلبات المؤكدة فقط</span>
                      </span>
                      <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30 font-mono">
                        {confirmedOrders.length} طلب مؤكد
                      </span>
                    </div>
                  </div>

                  {/* المربع الثاني: عدد الأوردرات المؤكدة ونشاط الزبائن */}
                  <div className="group rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 border border-indigo-500/40 bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-purple-950/80 hover:border-indigo-400 hover:shadow-indigo-500/10">
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400/25 to-purple-500/10 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shadow-lg shadow-indigo-500/20">
                          <ShoppingBag className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                          <span className="text-sm sm:text-base font-black text-white block tracking-wide">عدد الأوردرات المؤكدة</span>
                          <span className="text-[11px] text-indigo-200/70 font-bold">الفترة: {activePeriodLabel}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        <span>تم الضغط على تأكيد</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-3 mb-3 relative z-10">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-300 tracking-tight drop-shadow-sm font-mono">
                          {confirmedOrders.length.toLocaleString('ar-EG')}
                        </span>
                        <span className="text-sm sm:text-base font-black text-indigo-400">أوردر</span>
                      </div>

                      <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl px-3 py-1.5 text-left shrink-0 shadow-inner">
                        <div className="text-[10px] text-indigo-200/80 font-bold flex items-center gap-1 justify-end">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>كام شخص طلب؟</span>
                        </div>
                        <div className="text-sm sm:text-lg font-black text-amber-300 text-right font-mono">
                          {uniqueConfirmedCustomerCount.toLocaleString('ar-EG')} <span className="text-xs text-indigo-200/60 font-medium">عميل</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-indigo-200/70 font-medium pt-3.5 border-t border-indigo-500/20 relative z-10">
                      <span className="flex items-center gap-1.5">
                        <span>👥</span>
                        <span>عملاء الطلبات المؤكدة</span>
                      </span>
                      <span className="text-amber-300 font-bold bg-slate-950/60 px-2.5 py-1 rounded-xl border border-indigo-500/30 font-mono">
                        من {uniqueConfirmedCustomerCount} شخص مختلف
                      </span>
                    </div>
                  </div>

                  {/* المربع الثالث: الطلبات الملغية وإجمالي مبالغها */}
                  <div className="group rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 border border-rose-500/40 bg-gradient-to-br from-rose-950/90 via-slate-900/95 to-red-950/80 hover:border-rose-400 hover:shadow-rose-500/10">
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-rose-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400/25 to-red-500/10 text-rose-300 flex items-center justify-center border border-rose-400/30 shadow-lg shadow-rose-500/20">
                          <XCircle className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                          <span className="text-sm sm:text-base font-black text-white block tracking-wide">الطلبات الملغية ومبالغها</span>
                          <span className="text-[11px] text-rose-200/70 font-bold">الفترة: {activePeriodLabel}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/40 shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        <span>ملغي / فاقد</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-3 mb-3 relative z-10">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-white to-rose-300 tracking-tight drop-shadow-sm font-mono">
                          {cancelledRevenue.toLocaleString('ar-EG')}
                        </span>
                        <span className="text-sm sm:text-base font-black text-rose-400">جنيه</span>
                      </div>

                      <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl px-3 py-1.5 text-left shrink-0 shadow-inner">
                        <div className="text-[10px] text-rose-200/80 font-bold flex items-center gap-1 justify-end">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>عدد الملغي</span>
                        </div>
                        <div className="text-sm sm:text-lg font-black text-rose-300 text-right font-mono">
                          {cancelledOrders.length.toLocaleString('ar-EG')} <span className="text-xs text-rose-200/60 font-medium">أوردر</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-rose-200/70 font-medium pt-3.5 border-t border-rose-500/20 relative z-10">
                      <span className="flex items-center gap-1.5">
                        <span>🚫</span>
                        <span>قيمة المبيعات غير المحصلة</span>
                      </span>
                      <span className="text-rose-300 font-bold bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-500/30 font-mono">
                        {cancelledOrders.length} طلب ملغي
                      </span>
                    </div>
                  </div>

                </div>

                {/* التحليل الشهري للسنة الحالية (جدول شهور السنة وتوزيع المبيعات) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span>تقرير مبيعات أشهر العام الحالي ({new Date().getFullYear()}):</span>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">12 شهر</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {monthlyStats.map(m => (
                      <div
                        key={m.name}
                        className={`p-3 rounded-2xl border transition ${
                          m.confirmedRevenue > 0
                            ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/40'
                            : 'bg-slate-950/40 border-slate-800/80 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                          <span>{m.name}</span>
                          <span className="font-mono text-[11px] text-amber-400">{m.confirmedCount} طلب</span>
                        </div>
                        <div className="text-sm font-black text-emerald-400 font-mono">
                          {m.confirmedRevenue.toLocaleString()} ج.م
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* توزيع طرق الدفع ونوع الطلب (دليفري vs تيك أواي) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* طرق الدفع */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-black text-white pb-2 border-b border-slate-800">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>توزيع طرق الدفع (الفترة المحددة):</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-bold">كاش (نقدي)</span>
                        <span className="text-base font-black text-emerald-400 font-mono block mt-1">{paymentMethodStats.cash.toLocaleString()} ج.م</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-bold">محافظ إلكترونية</span>
                        <span className="text-base font-black text-amber-400 font-mono block mt-1">{paymentMethodStats.wallet.toLocaleString()} ج.م</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-bold">إنستاباي</span>
                        <span className="text-base font-black text-cyan-400 font-mono block mt-1">{paymentMethodStats.instapay.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* نوع الطلب */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-black text-white pb-2 border-b border-slate-800">
                      <Bike className="w-4 h-4 text-sky-400" />
                      <span>نوع الطلب (توصيل vs استلام):</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-bold">🛵 طلبات الدليفري</span>
                        <span className="text-base font-black text-sky-400 font-mono block mt-1">{orderTypeStats.delivery} طلب</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-bold">🏬 استلام من الفرع</span>
                        <span className="text-base font-black text-purple-400 font-mono block mt-1">{orderTypeStats.pickup} طلب</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* وحدة الفلترة التفاعلية وقائمة الطلبات المسجلة تاريخياً */}
                <div className="space-y-4">
                  
                  {/* الفلاتر التفاعلية: اليوم، الأسبوع، الشهر، السنة، مخصص */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
                    
                    {/* السطر الأول: فلاتر الوقت */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                        <Calendar className="w-4 h-4 text-rose-500" />
                        <span>تصفية التحليلات حسب الوقت:</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        {[
                          { id: 'today', label: 'اليوم' },
                          { id: 'week', label: 'هذا الأسبوع' },
                          { id: 'month', label: 'هذا الشهر' },
                          { id: 'year', label: 'هذه السنة' },
                          { id: 'all', label: 'كل الأوقات' },
                          { id: 'custom', label: '📅 فترة مخصصة (من يوم كذا لكذا)' }
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => setTimeFilter(btn.id as any)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              timeFilter === btn.id
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/30'
                                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* السطر الثاني: إذا تم اختيار فترة مخصصة */}
                    {timeFilter === 'custom' && (
                      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-950/70 border border-rose-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>تحديد التواريخ من وإلى:</span>
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 font-bold">من يوم:</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 font-bold">إلى يوم:</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        {(customStartDate || customEndDate) && (
                          <button
                            type="button"
                            onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                            className="text-xs text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                          >
                            إعادة ضبط التواريخ
                          </button>
                        )}
                      </div>
                    )}

                    {/* السطر الثالث: البحث بالاسم ورقم الهاتف وزر التحديث */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-96">
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          placeholder="فلترة بالاسم أو رقم الهاتف..."
                          className="w-full py-2.5 px-4 pr-10 pl-8 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                        <Search className="absolute top-3 right-3.5 w-4 h-4 text-slate-400" />
                        {customerSearchQuery && (
                          <button
                            onClick={() => setCustomerSearchQuery('')}
                            className="absolute top-2.5 left-3 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-xs text-slate-400 font-bold bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                          النتائج: <span className="text-white font-black font-mono">{filteredOrders.length}</span> طلب • <span className="text-amber-400 font-black font-mono">{uniqueCustomerCount}</span> عميل
                        </div>
                        <button
                          onClick={loadOrders}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                          title="تحديث فوري للطلبات"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">تحديث</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* قائمة جميع الطلبات المفلترة */}
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-300">لا توجد طلبات مسجلة حالياً لهذه الفترة</h3>
                      <p className="text-xs text-slate-500">جرب اختيار فترة زمنية أخرى أو إزالة قيود البحث.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map(order => (
                        <div key={order.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                                #{String(order.id).slice(-6)}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-base font-black text-white">{order.customer_name}</h4>
                                  {order.status === 'confirmed' ? (
                                    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>مؤكد</span>
                                    </span>
                                  ) : order.status === 'cancelled_not_received' ? (
                                    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                                      <XCircle className="w-3 h-3 text-red-400" />
                                      <span>ملغي (عدم استلام)</span>
                                    </span>
                                  ) : order.status === 'cancelled_before_dispatch' ? (
                                    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-amber-400" />
                                      <span>ملغي قبل الخروج</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-sky-400" />
                                      <span>جديد (بانتظار التأكيد)</span>
                                    </span>
                                  )}
                                  {order.created_at && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {formatOrderTime(order.created_at)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800 font-mono dir-ltr">
                                    <Phone className="w-3 h-3 text-emerald-400" />
                                    <span>{order.customer_phone}</span>
                                  </span>
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                    {order.order_type === 'takeaway' || order.delivery_zone === 'استلام من المطعم' || !order.delivery_zone || order.delivery_zone === 'غير محدد'
                                      ? '🏬 استلام تيك أواي من المحل'
                                      : `🛵 دليفري: ${order.delivery_zone}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* زر حذف الطلب */}
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/80 transition cursor-pointer text-xs font-bold shrink-0"
                              title="حذف هذا الطلب من السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف الطلب</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                              <span className="text-slate-500 block font-bold">العنوان بالتفصيل:</span>
                              <p className="text-slate-200 font-medium">{order.delivery_address || 'استلام من المطعم'}</p>
                              {order.building_notes && <span className="text-[11px] text-amber-400/80 block">ملاحظات: {order.building_notes}</span>}
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                              <span className="text-slate-500 block font-bold">الدفع والإجمالي:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-rose-400 font-mono">{order.total_amount} ج.م</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                  {order.payment_method === 'vodafone_cash' ? 'محفظة كاش' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش عند الاستلام'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block">عدد الأصناف: {order.items_count} | توصيل: {order.delivery_fee} ج.م</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-around gap-2">
                              <a href={`tel:${order.customer_phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs">
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span>اتصال</span>
                              </a>
                              <a href={`https://wa.me/2${(order.customer_phone || '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold transition text-xs">
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>واتساب</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* نافذة تأكيد تقفيل الوردية وتصفير الفواتير من لوحة الإدارة - تصميم نظيف وعصري */}
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 border border-slate-800 bg-slate-900 text-white shadow-2xl shadow-black/80 space-y-4 font-sans">
              
              {/* رأس النافذة */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">
                        تقفيل الوردية #{currentShiftNumber}
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                        تصفير الفواتير
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ملخص مبيعات الوردية الحالية قبل الترحيل للأرشيف
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  disabled={isClosingShift}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* توقيت الوردية */}
              <div className="px-3.5 py-2.5 rounded-xl border border-slate-700/60 bg-slate-800/60 text-slate-300 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>البدء: <strong className="font-bold text-amber-500">{currentShiftStartTime ? formatOrderTime(currentShiftStartTime) : 'بداية اليوم'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>الإغلاق: <strong className="font-bold">{formatOrderTime(new Date().toISOString())}</strong></span>
                </div>
              </div>

              {/* الصف 1: حركة الفواتير (الإجمالي | المؤكد | الملغي) */}
              <div className="grid grid-cols-3 gap-2">
                {/* الإجمالي */}
                <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/50 text-center">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">🧾 إجمالي الفواتير</span>
                  <span className="text-xl font-bold text-amber-500 block">{currentShiftStats.totalOrders}</span>
                </div>

                {/* المؤكد */}
                <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-center">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-1">✅ المؤكدة</span>
                  <span className="text-xl font-bold text-emerald-500 block">{currentShiftStats.confirmedOrders}</span>
                </div>

                {/* الملغي */}
                <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-center">
                  <span className="text-[11px] font-bold text-rose-400 block mb-1">🚫 الملغية</span>
                  <span className="text-xl font-bold text-rose-500 block">{currentShiftStats.cancelledOrders}</span>
                </div>
              </div>

              {/* كارت صافي المبيعات البارز */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">💰 صافي مبيعات الوردية</span>
                    <span className="text-[11px] text-slate-400 block">إجمالي مبيعات الفواتير المؤكدة</span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-2xl font-black text-emerald-500">
                    {currentShiftStats.totalRevenue.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400 mr-1">ج.م</span>
                </div>
              </div>

              {/* الصف 2: الصالة والدليفري بجانب بعضهما */}
              <div className="grid grid-cols-2 gap-2">
                {/* الدليفري */}
                <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-500">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-sky-400 block">طلبات الدليفري</span>
                      <span className="text-[10px] text-slate-400 block">توصيل منزلي</span>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-sky-500">
                    {currentShiftStats.deliveryCount} <span className="text-[11px] font-normal text-slate-400">طلب</span>
                  </div>
                </div>

                {/* الصالة وتيك أواي (بجانب الدليفري) */}
                <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-500">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-purple-400 block">صالة وتيك أواي</span>
                      <span className="text-[10px] text-slate-400 block">استلام مباشر</span>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-purple-500">
                    {currentShiftStats.pickupCount} <span className="text-[11px] font-normal text-slate-400">طلب</span>
                  </div>
                </div>
              </div>

              {/* تفصيل طرق الدفع */}
              <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/40 space-y-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>طرق تحصيل المبيعات:</span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg border border-slate-700 bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">💵 كاش (نقدي)</span>
                    <span className="font-bold text-emerald-500 block mt-0.5">{currentShiftStats.cashAmount.toLocaleString()} ج.م</span>
                  </div>

                  <div className="p-2 rounded-lg border border-slate-700 bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">📱 محافظ</span>
                    <span className="font-bold text-amber-500 block mt-0.5">{currentShiftStats.walletAmount.toLocaleString()} ج.م</span>
                  </div>

                  <div className="p-2 rounded-lg border border-slate-700 bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">⚡ إنستاباي</span>
                    <span className="font-bold text-cyan-500 block mt-0.5">{currentShiftStats.instapayAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* تنبيه الطلبات المعلقة إن وجدت */}
              {currentShiftStats.pendingOrders > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 flex items-center gap-2.5 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>تنبيه: يوجد {currentShiftStats.pendingOrders} طلبات قيد الانتظار سيتم ترحيلها مع هذه الوردية.</span>
                </div>
              )}

              {/* تنبيه تصفير الشاشة */}
              <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-950/30 text-blue-200 flex items-start gap-2 text-xs leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  عند التأكيد سيتم تصفير فواتير شاشة المتابعة وشاشة الإدارة فوراً للوردية الجديدة رقم #{currentShiftNumber + 1} مع نقل كافة الفواتير لأرشيف <strong>فواتير الورديات</strong>.
                </span>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAdminConfirmCloseShift}
                  disabled={isClosingShift}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-sm transition cursor-pointer shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isClosingShift ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التقفيل والتصفير...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>تأكيد تقفيل الوردية وتصفير الفواتير</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  disabled={isClosingShift}
                  className="py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer active:scale-[0.98] border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  إلغاء
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* مودال استعراض فواتير الوردية بالتفصيل (selectedShiftForView) */}
        {/* ========================================================================= */}
        {selectedShiftForView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-7 border-2 border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl space-y-5">
              
              {/* ترويسة المودال */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                      <span>فواتير الوردية رقم #{selectedShiftForView.shiftNumber}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-amber-300 border border-amber-500/30 font-mono">
                        {selectedShiftForView.orders?.length || selectedShiftForView.orderIds?.length || 0} فاتورة
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      الفترة من {formatOrderTime(selectedShiftForView.openedAt)} إلى {formatOrderTime(selectedShiftForView.closedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handlePrintShiftSummary(selectedShiftForView)}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الكشف 🖨️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedShiftForView(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* أدوات البحث والفلترة داخل فواتير الوردية */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={shiftInvoicesSearchQuery}
                    onChange={(e) => setShiftInvoicesSearchQuery(e.target.value)}
                    placeholder="بحث في فواتير الوردية بالاسم أو الهاتف..."
                    className="w-full py-2 px-3.5 pr-9 pl-7 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                  <Search className="absolute top-2.5 right-3 w-3.5 h-3.5 text-slate-400" />
                  {shiftInvoicesSearchQuery && (
                    <button
                      onClick={() => setShiftInvoicesSearchQuery('')}
                      className="absolute top-2 left-2.5 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {(['all', 'confirmed', 'cancelled'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setShiftInvoicesStatusFilter(tab)}
                      className={`flex-1 sm:flex-none py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                        shiftInvoicesStatusFilter === tab
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab === 'all' ? 'الكل' : tab === 'confirmed' ? 'المؤكد فقط' : 'الملغي فقط'}
                    </button>
                  ))}
                </div>
              </div>

              {/* قائمة الفواتير المعروضة في المودال */}
              {shiftInvoicesFilteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">لا توجد فواتير مطابقة لبحثك في هذه الوردية.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {shiftInvoicesFilteredOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                            #{String(order.id).slice(-6)}
                          </span>
                          <span className="text-sm font-black text-white">{order.customer_name}</span>

                          {/* زر تفاصيل الفاتورة بجوار الاسم مباشرة */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForDetails(order)}
                            className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                            title="عرض تفاصيل الفاتورة كاملة"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-950" />
                            <span>تفاصيل 🔍</span>
                          </button>

                          {order.status === 'confirmed' ? (
                            <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>مؤكد</span>
                            </span>
                          ) : typeof order.status === 'string' && order.status.startsWith('cancelled') ? (
                            <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span>ملغي</span>
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              قيد الانتظار
                            </span>
                          )}
                          {order.created_at && (
                            <span className="text-[10px] text-amber-400 font-bold">
                              {formatOrderTime(order.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-emerald-400">
                            {order.total_amount} ج.م
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                            {order.payment_method === 'vodafone_cash' ? 'محفظة كاش' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش'}
                          </span>
                        </div>
                      </div>

                      {/* أصناف الفاتورة إن وجدت */}
                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1 text-xs">
                          <span className="text-[10.5px] text-slate-400 font-bold block mb-1">محتويات الفاتورة:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {order.items.map((it: any, itIdx: number) => (
                              <span key={itIdx} className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-bold border border-slate-700/80">
                                {it.quantity || 1}x {it.name || it.item_name || 'صنف'} {it.total_price || it.price ? `(${(it.total_price || it.price)} ج)` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-300 font-bold">{order.customer_phone}</span>
                          <span>•</span>
                          <span>{order.delivery_address || (order.order_type === 'delivery' ? 'توصيل دليفري' : 'استلام من المطعم')}</span>
                          {order.building_notes && <span className="text-amber-400/80">({order.building_notes})</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>اتصال</span>
                          </a>
                          <a
                            href={`https://wa.me/2${(order.customer_phone || '').replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 transition flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>واتساب</span>
                          </a>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* زر الإغلاق السفلي */}
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShiftForView(null)}
                  className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black transition cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* مودال تفاصيل الفاتورة المنفردة للطلب (selectedOrderForDetails) */}
        {/* ========================================================================= */}
        {selectedOrderForDetails && (() => {
          const ord = selectedOrderForDetails;
          const parsed = parseOrderDetails(ord.special_notes);
          const itemsList = (Array.isArray(ord.items) && ord.items.length > 0)
            ? ord.items
            : parsed.items;
          const isCancelled = typeof ord.status === 'string' && ord.status.startsWith('cancelled');
          const isConfirmed = ord.status === 'confirmed';

          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
              <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-7 border-2 border-amber-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl space-y-5 font-sans">
                
                {/* زر إغلاق X بارز ومثبت في الجانب الأيسر العلوي */}
                <button
                  type="button"
                  onClick={() => { setSelectedOrderForDetails(null); setSelectedOrderShiftNumber(null); }}
                  className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition cursor-pointer active:scale-90 shadow-lg flex items-center justify-center"
                  title="إغلاق تفاصيل الفاتورة"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </button>

                {/* الترويسة وأزرار التحكم */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 pl-12 sm:pl-16">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black shrink-0">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-white">
                          تفاصيل الفاتورة #{String(ord.id).slice(-6)}
                        </h3>
                        {(selectedShiftForView || selectedOrderShiftNumber) && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            الوردية #{selectedShiftForView?.shiftNumber || selectedOrderShiftNumber}
                          </span>
                        )}
                        {isConfirmed ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>مؤكد ✅</span>
                          </span>
                        ) : isCancelled ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>ملغي 🚫</span>
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            قيد الانتظار ⏳
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>وقت إنشاء الطلب: {formatOrderTime(ord.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* زر طباعة الفاتورة الفردية */}
                    <button
                      type="button"
                      onClick={() => handlePrintSingleOrder(ord, selectedShiftForView?.shiftNumber || selectedOrderShiftNumber || undefined)}
                      className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="طباعة هذه الفاتورة"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة 🖨️</span>
                    </button>

                    {/* زر إغلاق */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForDetails(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="إغلاق"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* بيانات العميل والتوصيل */}
                <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>بيانات العميل والتوصيل:</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-slate-400 text-[11px] font-bold block">اسم العميل:</span>
                      <span className="text-sm font-black text-white block">{ord.customer_name}</span>
                      <div className="pt-1 flex items-center gap-2">
                        <a
                          href={`tel:${ord.customer_phone}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ord.customer_phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/2${(ord.customer_phone || '').replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition"
                          title="مراسلة واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-slate-400 text-[11px] font-bold block">نوع الاستلام والمنطقة:</span>
                      <div className="flex items-center gap-1.5 text-white font-black text-sm">
                        {ord.order_type === 'pickup' ? (
                          <>
                            <Store className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-300">استلام من الفرع</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-4 h-4 text-sky-400" />
                            <span className="text-sky-300">توصيل دليفري ({ord.delivery_zone || 'سنهور'})</span>
                          </>
                        )}
                      </div>
                      <div className="pt-1 text-[11px] text-slate-300 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{ord.delivery_address || (ord.order_type === 'pickup' ? 'استلام من داخل المطعم' : 'العنوان غير محدد')}</span>
                      </div>
                      {ord.building_notes && (
                        <span className="text-[10.5px] text-amber-300/90 block pt-0.5">
                          الدور / الشقة / علامة مميزة: {ord.building_notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {parsed.notes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start gap-2">
                      <span className="text-base leading-none">💬</span>
                      <div>
                        <strong className="block text-amber-200">ملاحظات العميل الخاصة:</strong>
                        <span>{parsed.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* قائمة محتويات وأصناف الفاتورة بالتفصيل */}
                <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4" />
                      <span>أصناف ومحتويات الفاتورة ({itemsList.length}):</span>
                    </h4>
                    <span className="text-[11px] text-slate-400 font-bold">
                      إجمالي الأصناف: {ord.items_count || itemsList.length}
                    </span>
                  </div>

                    <div className="space-y-2">
                    {itemsList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">لا توجد تفاصيل أصناف مسجلة لهذا الطلب.</p>
                    ) : typeof itemsList[0] === 'string' ? (
                      itemsList.map((itemStr: string, idx: number) => {
                        const parsedItem = parseItemLine(itemStr);
                        const isCasserole = parsedItem.isCustom || Boolean(parsedItem.base) || Boolean(parsedItem.protein);

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-black text-white">{parsedItem.name}</span>
                                  {!isCasserole && parsedItem.size && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                      {parsedItem.size}
                                    </span>
                                  )}
                                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                    × {parsedItem.quantity}
                                  </span>
                                </div>

                                {/* تفاصيل الطاجن بالترتيب المطلوب: الأساس -> البروتين -> الشطة -> بدون -> الإضافات -> ملاحظات */}
                                {isCasserole ? (
                                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs">
                                    {/* 1. الأساس */}
                                    {parsedItem.base && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">🍲 الأساس:</span>
                                        <span className="font-bold text-slate-100">{parsedItem.base}</span>
                                      </div>
                                    )}

                                    {/* 2. البروتين */}
                                    {parsedItem.protein && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">🥩 البروتين:</span>
                                        <span className="font-bold text-slate-100">{parsedItem.protein}</span>
                                      </div>
                                    )}

                                    {/* 3. الشطة */}
                                    {parsedItem.spice && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">🌶️ الشطة:</span>
                                        <span className="font-bold text-amber-300">{parsedItem.spice}</span>
                                      </div>
                                    )}

                                    {/* 4. بدون (مستبعدات) */}
                                    {parsedItem.without && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                                        <span className="font-black text-rose-400 min-w-[75px] shrink-0 flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                          <span>🚫 بدون:</span>
                                        </span>
                                        <span className="font-black tracking-wide text-rose-100">{parsedItem.without}</span>
                                      </div>
                                    )}

                                    {/* 5. الإضافات والمقرمشات */}
                                    {parsedItem.extrasList && parsedItem.extrasList.length > 0 && (
                                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                                        <div className="flex items-center gap-1.5 font-black text-emerald-400">
                                          <Sparkles className="w-3.5 h-3.5" />
                                          <span>✨ الإضافات والمقرمشات ({parsedItem.extrasList.length}):</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                          {parsedItem.extrasList.map((extraItem, eIdx) => (
                                            <span key={eIdx} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-bold">
                                              {extraItem}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* 6. ملاحظات خاصة بالصنف */}
                                    {parsedItem.notes && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">💬 ملاحظات:</span>
                                        <span className="font-bold text-white">{parsedItem.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  (parsedItem.without || parsedItem.notes || (parsedItem.extrasList && parsedItem.extrasList.length > 0) || parsedItem.details) ? (
                                    <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                                      {/* بدون (المستبعدات للأصناف العادية) */}
                                      {parsedItem.without && (
                                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                                          <span className="font-black text-rose-400 min-w-[65px] shrink-0 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                            <span>🚫 بدون:</span>
                                          </span>
                                          <span className="font-black tracking-wide text-rose-100">{parsedItem.without}</span>
                                        </div>
                                      )}

                                      {/* إضافات الصنف إن وجدت */}
                                      {parsedItem.extrasList && parsedItem.extrasList.length > 0 && (
                                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                                          <div className="flex items-center gap-1.5 font-black text-emerald-400">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>✨ إضافات ({parsedItem.extrasList.length}):</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                                            {parsedItem.extrasList.map((extraItem, eIdx) => (
                                              <span key={eIdx} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-bold">
                                                {extraItem}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* ملاحظات الصنف العادي */}
                                      {parsedItem.notes && (
                                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
                                          <span className="font-black text-amber-400 min-w-[65px] shrink-0">💬 ملاحظة:</span>
                                          <span className="font-bold text-white">{parsedItem.notes}</span>
                                        </div>
                                      )}

                                      {!parsedItem.without && !parsedItem.notes && (!parsedItem.extrasList || parsedItem.extrasList.length === 0) && parsedItem.details && (
                                        <p className="text-[11px] text-slate-400 mt-1">
                                          [{parsedItem.details}]
                                        </p>
                                      )}
                                    </div>
                                  ) : null
                                )}
                              </div>
                            </div>

                            {parsedItem.price && (
                              <span className="text-sm font-black text-amber-300 shrink-0 mt-0.5">
                                {parsedItem.price}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      itemsList.map((it: any, idx: number) => {
                        const hasCustomDish = Boolean(it.customDishDetails);

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-black text-white">{it.name || it.item_name || 'صنف'}</span>
                                  {!hasCustomDish && it.selectedSize && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                      {it.selectedSize}
                                    </span>
                                  )}
                                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                    × {it.quantity || 1}
                                  </span>
                                </div>

                                {/* تفاصيل الطاجن المخصوص المخزن كـ Object */}
                                {hasCustomDish ? (
                                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs">
                                    {/* 1. الأساس */}
                                    {it.customDishDetails.base && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">🍲 الأساس:</span>
                                        <span className="font-bold text-slate-100">{it.customDishDetails.base}</span>
                                      </div>
                                    )}

                                    {/* 2. البروتين */}
                                    {it.customDishDetails.meat && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">🥩 البروتين:</span>
                                        <span className="font-bold text-slate-100">{it.customDishDetails.meat}</span>
                                      </div>
                                    )}

                                    {/* 3. الشطة */}
                                    {it.customDishDetails.spice && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">🌶️ الشطة:</span>
                                        <span className="font-bold text-amber-300">{it.customDishDetails.spice}</span>
                                      </div>
                                    )}

                                    {/* 4. بدون */}
                                    {it.customDishDetails.noOptions && it.customDishDetails.noOptions.length > 0 && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                                        <span className="font-black text-rose-400 min-w-[75px] shrink-0 flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                          <span>🚫 بدون:</span>
                                        </span>
                                        <span className="font-black tracking-wide text-rose-100">{it.customDishDetails.noOptions.join('، ')}</span>
                                      </div>
                                    )}

                                    {/* 5. الإضافات */}
                                    {((it.customDishDetails.toppings && it.customDishDetails.toppings.length > 0) || (it.extras && it.extras.length > 0)) && (
                                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                                        <div className="flex items-center gap-1.5 font-black text-emerald-400">
                                          <Sparkles className="w-3.5 h-3.5" />
                                          <span>✨ الإضافات والمقرمشات:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                          {it.customDishDetails.toppings?.map((topping: string, tIdx: number) => (
                                            <span key={tIdx} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-bold">
                                              {topping}
                                            </span>
                                          ))}
                                          {it.extras?.map((extra: any, eIdx: number) => (
                                            <span key={`ex-${eIdx}`} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-bold">
                                              {extra.name} {extra.price ? `(+${extra.price} ج)` : ''}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* 6. ملاحظات */}
                                    {((it.customDishDetails.customNotes && it.customDishDetails.customNotes.length > 0) || it.notes) && (
                                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
                                        <span className="font-black text-amber-400 min-w-[75px] shrink-0">💬 ملاحظات:</span>
                                        <span className="font-bold text-white">
                                          {[...(it.customDishDetails.customNotes || []), it.notes].filter(Boolean).join('، ')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  (() => {
                                    const itemWithout = (it.itemNotes || []).filter((n: string) => n.includes('بدون')).map((n: string) => n.replace(/^بدون:?\s*/, '').trim()).join('، ');
                                    const itemOtherNotes = [
                                      ...(it.itemNotes || []).filter((n: string) => !n.includes('بدون')),
                                      it.notes
                                    ].filter(Boolean).join('، ');
                                    const hasExtras = it.extras && it.extras.length > 0;

                                    if (!itemWithout && !itemOtherNotes && !hasExtras) return null;

                                    return (
                                      <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                                        {itemWithout && (
                                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                                            <span className="font-black text-rose-400 min-w-[65px] shrink-0 flex items-center gap-1">
                                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                              <span>🚫 بدون:</span>
                                            </span>
                                            <span className="font-black tracking-wide text-rose-100">{itemWithout}</span>
                                          </div>
                                        )}

                                        {hasExtras && (
                                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                                            <div className="flex items-center gap-1.5 font-black text-emerald-400">
                                              <Sparkles className="w-3.5 h-3.5" />
                                              <span>✨ الإضافات:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                              {it.extras.map((extra: any, eIdx: number) => (
                                                <span key={`ex-${eIdx}`} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-bold">
                                                  {extra.name} {extra.price ? `(+${extra.price} ج)` : ''}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {itemOtherNotes && (
                                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
                                            <span className="font-black text-amber-400 min-w-[65px] shrink-0">💬 ملاحظة:</span>
                                            <span className="font-bold text-white">{itemOtherNotes}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()
                                )}
                              </div>
                            </div>

                            <span className="text-sm font-black text-amber-300 shrink-0 mt-0.5">
                              {(it.total_price || it.price || 0)} ج.م
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ملخص الحساب والإجمالي */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                  <h4 className="text-xs font-black text-slate-300 mb-2">ملخص الحساب وطريقة الدفع:</h4>

                  {ord.subtotal ? (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>المجموع الفرعي للأصناف:</span>
                      <span className="text-white font-bold">{ord.subtotal} ج.م</span>
                    </div>
                  ) : null}

                  {ord.delivery_fee !== undefined && ord.delivery_fee !== null ? (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>خدمة التوصيل (الدليفري):</span>
                      <span className="text-white font-bold">
                        {ord.delivery_fee > 0 ? `${ord.delivery_fee} ج.م` : 'مجاناً / استلام من الفرع'}
                      </span>
                    </div>
                  ) : null}

                  {ord.discount_amount ? (
                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                      <span>قيمة الخصم {ord.coupon_code ? `(كوبون: ${ord.coupon_code})` : ''}:</span>
                      <span>-{ord.discount_amount} ج.م</span>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-sm font-black text-white">طريقة الدفع:</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs">
                      {ord.payment_method === 'vodafone_cash'
                        ? '📱 محفظة فودافون كاش'
                        : ord.payment_method === 'instapay'
                        ? '⚡ إنستاباي'
                        : '💵 كاش عند الاستلام'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-base sm:text-lg font-black text-white block">المبلغ الإجمالي الصافي:</span>
                      <span className="text-[11px] text-slate-400">شامل التوصيل وأي خصومات</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {ord.total_amount} ج.م
                    </span>
                  </div>
                </div>

                {/* أزرار الإغلاق السفلية */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handlePrintSingleOrder(ord, selectedShiftForView?.shiftNumber || selectedOrderShiftNumber || undefined)}
                    className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-black transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الفاتورة 🖨️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedOrderForDetails(null); setSelectedOrderShiftNumber(null); }}
                    className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer active:scale-95 shadow-lg"
                  >
                    إغلاق تفاصيل الفاتورة
                  </button>
                </div>

              </div>
            </div>
          );
        })()}

      {activeTab === 'coupons' && (
        <div className="space-y-6">
          {/* شريط الإشعارات للكوبونات */}
          {couponNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{couponNotice}</span>
              </div>
              <button onClick={() => setCouponNotice(null)} className="text-emerald-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ترويسة إدارة الكوبونات ومفتاح التحكم الرئيسي في السلة */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white">إدارة كوبونات وقسائم الخصم</h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {coupons.length} كوبون
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تحكم بالكامل في العروض الترويجية، حدود مرات الاستخدام، وتواريخ انتهاء الصلاحية
                  </p>
                </div>
              </div>

              {/* أزرار الإجراء السريع والتحكم الرئيسي */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* مفتاح تفعيل ظهور الكوبون في السلة */}
                <button
                  type="button"
                  onClick={() => {
                    toggleCouponsEnabled();
                    showCouponNotice(isCouponsEnabled ? 'تم إخفاء خانة الكوبون من السلة' : 'تم تفعيل ظهور خانة الكوبون في السلة 🟢');
                  }}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-md ${
                    isCouponsEnabled
                      ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-emerald-600/20 ring-1 ring-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="التحكم فيما إذا كان حقل الكوبون يظهر للزبون في سلة الشراء أم لا"
                >
                  <Tag className="w-4 h-4" />
                  <span>ظهور الكوبون بالسلة:</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                    isCouponsEnabled ? 'bg-emerald-500/30 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {isCouponsEnabled ? 'مفعل 🟢' : 'معطل ⚪'}
                  </span>
                </button>

                {/* زر إضافة كوبون جديد */}
                <button
                  type="button"
                  onClick={openAddCouponModal}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>إضافة كوبون جديد</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 بطاقات إحصائية سريعة */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">إجمالي الكوبونات</span>
                <Tag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{couponStats.total}</div>
              <span className="text-[10px] text-slate-500">مسجلة بالنظام</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">كوبونات سارية ونشطة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{couponStats.active}</div>
              <span className="text-[10px] text-slate-500">صالحة للاستخدام الآن</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">مرات الاستخدام الإجمالية</span>
                <ShoppingBag className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{couponStats.totalUses}</div>
              <span className="text-[10px] text-slate-500">طلب تم تفعيل خصم له</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold">حالة الكوبون بالسلة</span>
                <Sliders className="w-4 h-4 text-purple-400" />
              </div>
              <div className={`text-sm sm:text-base font-black ${isCouponsEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isCouponsEnabled ? 'ظاهر للعملاء 🟢' : 'مخفي من السلة ⚪'}
              </div>
              <span className="text-[10px] text-slate-500">{isCouponsEnabled ? 'الزبائن تستطيع إدخال كود' : 'الخانة غير معروضة بالمتجر'}</span>
            </div>
          </div>

          {/* شريط البحث وتصفية الحالة */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 p-3 rounded-2xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={couponSearchQuery}
                onChange={(e) => setCouponSearchQuery(e.target.value)}
                placeholder="ابحث بالكود أو الملاحظة..."
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCouponFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  couponFilterStatus === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الكل ({coupons.length})
              </button>
              <button
                type="button"
                onClick={() => setCouponFilterStatus('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  couponFilterStatus === 'active'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                السارية فقط ({couponStats.active})
              </button>
              <button
                type="button"
                onClick={() => setCouponFilterStatus('expired')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  couponFilterStatus === 'expired'
                    ? 'bg-red-500 text-white font-black shadow'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                المنتهية والمستنفدة
              </button>
              <button
                type="button"
                onClick={() => setCouponFilterStatus('disabled')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  couponFilterStatus === 'disabled'
                    ? 'bg-slate-700 text-white font-black shadow'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                المعطلة
              </button>
            </div>
          </div>

          {/* شبكة عرض بطاقات الكوبونات */}
          {filteredCoupons.length === 0 ? (
            <div className="p-10 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Gift className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">لا توجد كوبونات تطابق البحث أو الفلتر</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {couponSearchQuery
                  ? 'لم يتم العثور على أي كوبون يطابق كلمة البحث الحالية.'
                  : 'ابدأ بإنشاء أول كود خصم ترويجي للمطعم لزيادة المبيعات وجذب الأكيلة!'}
              </p>
              <button
                type="button"
                onClick={openAddCouponModal}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة كوبون جديد الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon) => {
                const now = Date.now();
                const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt).getTime() < now : false;
                const isLimitReached = coupon.maxUses !== undefined && coupon.maxUses !== null ? (coupon.usedCount || 0) >= coupon.maxUses : false;
                const isFullyActive = coupon.isActive && !isExpired && !isLimitReached;

                // Usage percentage
                const usagePercent = coupon.maxUses ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.maxUses) * 100)) : null;

                return (
                  <div
                    key={coupon.id}
                    className={`rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between p-5 space-y-4 ${
                      isFullyActive
                        ? 'bg-slate-900/90 border-amber-500/40 shadow-lg hover:border-amber-400/70 hover:shadow-amber-500/10'
                        : !coupon.isActive
                        ? 'bg-slate-900/50 border-slate-800 opacity-75'
                        : 'bg-slate-900/60 border-red-500/30'
                    }`}
                  >
                    {/* الجزء العلوي: الكود وحالة الكوبون */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* شارة الحالة */}
                        {isFullyActive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>ساري ونشط 🟢</span>
                          </span>
                        ) : !coupon.isActive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                            <span>معطل مؤقتاً ⚪</span>
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>منتهي الصلاحية ⏳</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>استُنفد الحد 🚫</span>
                          </span>
                        )}

                        {/* قيمة الخصم */}
                        <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center gap-1">
                          {coupon.discountType === 'percentage' ? (
                            <>
                              <Percent className="w-3.5 h-3.5 text-amber-400" />
                              <span>خصم {coupon.discountValue}%</span>
                            </>
                          ) : (
                            <>
                              <Tag className="w-3.5 h-3.5 text-amber-400" />
                              <span>خصم {coupon.discountValue} ج.م</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* بطاقة كود الكوبون مع زر النسخ */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-dashed border-amber-500/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-base sm:text-lg font-black tracking-wider text-white">
                            {coupon.code}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyCouponCode(coupon.code)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="نسخ كود الكوبون"
                        >
                          {copiedCouponCode === coupon.code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* تفاصيل الكوبون: الاستخدام وتاريخ الانتهاء والحد الأدنى */}
                      <div className="space-y-2 text-xs pt-1">
                        {/* عدد مرات الاستخدام */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-bold flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-slate-400" />
                              <span>مرات الاستخدام:</span>
                            </span>
                            <span className="text-white font-black">
                              {coupon.usedCount || 0}
                              {coupon.maxUses !== undefined && coupon.maxUses !== null ? (
                                <span className="text-slate-400 font-normal"> / {coupon.maxUses} مرة</span>
                              ) : (
                                <span className="text-amber-400 font-normal"> (غير محدود ∞)</span>
                              )}
                            </span>
                          </div>
                          {usagePercent !== null && (
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 75 ? 'bg-orange-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* تاريخ ووقت انتهاء الصلاحية */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>الصلاحية:</span>
                          </span>
                          <span className={`font-bold ${isExpired ? 'text-red-400' : 'text-slate-300'}`}>
                            {coupon.expiresAt ? (
                              new Date(coupon.expiresAt).toLocaleString('ar-EG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                              })
                            ) : (
                              'صالح دائماً (بلا انتهاء) ♾️'
                            )}
                          </span>
                        </div>

                        {/* الحد الأدنى للطلب إن وجد */}
                        {coupon.minOrderAmount ? (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-bold">أقل طلب للتفعيل:</span>
                            <span className="text-amber-300 font-black">{coupon.minOrderAmount} ج.م</span>
                          </div>
                        ) : null}

                        {/* ملاحظة الكوبون إن وجدت */}
                        {coupon.note && (
                          <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 italic">
                            💬 {coupon.note}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* الجزء السفلي: أزرار التحكم بالكوبون */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      {/* زر تشغيل / إيقاف التفعيل */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleCouponActive(coupon.id);
                          showCouponNotice(`تم ${coupon.isActive ? 'تعطيل' : 'تفعيل'} الكوبون ${coupon.code}`);
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          coupon.isActive
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        }`}
                        title={coupon.isActive ? 'إيقاف الكوبون مؤقتاً' : 'تفعيل الكوبون الآن'}
                      >
                        {coupon.isActive ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>تعطيل مؤقت</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>تفعيل الكوبون</span>
                          </>
                        )}
                      </button>

                      {/* زر تعديل */}
                      <button
                        type="button"
                        onClick={() => openEditCouponModal(coupon)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 transition cursor-pointer"
                        title="تعديل تفاصيل الكوبون"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* زر حذف */}
                      <button
                        type="button"
                        onClick={() => setCouponToDelete(coupon)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 transition cursor-pointer"
                        title="حذف هذا الكوبون نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

{/* كارت إعدادات عرض شريط الهدية التحفيزي في السلة (أضف بـ 75 ج.م للحصول على تحلية أو كانز هدية!) */}
          <div className="bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* ترويسة الكارت وزر التفعيل المباشر */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl shadow-lg shadow-amber-500/10 shrink-0">
                  {incentiveForm.rewardIcon || '🎁'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      إعدادات عرض شريط الهدية التحفيزية في السلة
                    </h3>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Smart Cart Incentive 🎯
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    شريط ذكي يظهر أعلى سلة الزبائن يوضح المبلغ المتبقي لنيل تحلية أو هدية مجانية لزيادة متوسط قيمة الطلب
                  </p>
                </div>
              </div>

              {/* زر التفعيل السريع للعرض بالسلة */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !incentiveForm.isEnabled;
                    setIncentiveForm(prev => ({ ...prev, isEnabled: next }));
                    updateCartIncentiveSettings({ isEnabled: next });
                    showIncentiveNotice(next ? 'تم تفعيل شريط الهدية في السلة 🟢' : 'تم إخفاء شريط الهدية من السلة ⚪');
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-md ${
                    incentiveForm.isEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 ring-1 ring-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>حالة العرض بالسلة:</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    incentiveForm.isEnabled ? 'bg-emerald-500/30 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {incentiveForm.isEnabled ? 'مفعل ويظهر للزبائن 🟢' : 'معطل ومخفي ⚪'}
                  </span>
                </button>
              </div>
            </div>

            {/* صندوق المعاينة الحية الفورية للشريط كما يراه الزبون */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 relative z-10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>معاينة حية فورية لشريط السلة التفاعلي:</span>
                </span>
                
                {/* محاكي قيمة السلة للتجربة الحية */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">سلة تجريبية:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewCartAmount(Math.max(20, Math.floor(Number(incentiveForm.targetAmount) * 0.6)))}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      previewCartAmount < Number(incentiveForm.targetAmount)
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    قبل الهدف (متبقي)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCartAmount(Number(incentiveForm.targetAmount) + 15)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      previewCartAmount >= Number(incentiveForm.targetAmount)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    بعد تحقيق الهدف (مكتمل)
                  </button>
                </div>
              </div>

              {/* بطاقة المعاينة كما تظهر في CartDrawer تماماً */}
              {(() => {
                const target = Number(incentiveForm.targetAmount) || 75;
                const current = previewCartAmount;
                const isReached = current >= target;
                const remaining = Math.max(0, target - current);
                const percent = Math.min(100, Math.round((current / target) * 100));
                const reward = incentiveForm.rewardText || 'تحلية أو كانز هدية';
                const preMsg = (incentiveForm.preGoalMessage || 'أضف بـ {remaining} ج.م إضافية للحصول على {reward}!')
                  .replace('{remaining}', String(remaining))
                  .replace('{reward}', reward);
                const postMsg = (incentiveForm.postGoalMessage || '🎉 مبروك! حصلت على {reward} مع طلبك!')
                  .replace('{remaining}', '0')
                  .replace('{reward}', reward);

                return (
                  <div className={`p-4 rounded-2xl border transition-all duration-300 space-y-2.5 ${
                    isReached
                      ? 'bg-gradient-to-r from-emerald-950/40 via-amber-950/30 to-orange-950/30 border-emerald-500/40 shadow-sm'
                      : 'bg-gradient-to-r from-red-950/40 via-amber-950/30 to-orange-950/30 border-amber-500/30'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`flex items-center gap-1.5 ${isReached ? 'text-emerald-300' : 'text-amber-300'}`}>
                        <span className="text-base">{incentiveForm.rewardIcon || '🎁'}</span>
                        <span>{isReached ? postMsg : preMsg}</span>
                      </span>
                      <span className={`text-xs font-black ${isReached ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isReached
                            ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                            : 'bg-gradient-to-r from-red-600 to-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isReached && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                        <span>✨ تم تفعيل الهدية الخاصة بنجاح مع طلبك</span>
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">هدية مجانية 100%</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* حقول التحكم والإعدادات الاحترافية */}
            <form onSubmit={handleSaveIncentive} className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* 1. الحد المالي المطلوب (الهدف بالجنيه) مع أزرار سريعة */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    الحد المالي المطلوب للحصول على الهدية (ج.م) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      step="5"
                      required
                      value={incentiveForm.targetAmount}
                      onChange={(e) => setIncentiveForm({ ...incentiveForm, targetAmount: Number(e.target.value) })}
                      placeholder="75"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-black text-sm focus:outline-none focus:border-amber-400 text-left"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      ج.م
                    </span>
                  </div>

                  {/* أزرار مبالغ سريعة */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 ml-1">قيم مقترحة:</span>
                    {[50, 75, 100, 120, 150, 200].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setIncentiveForm({ ...incentiveForm, targetAmount: amt })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                          incentiveForm.targetAmount === amt
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {amt} ج.م
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. اسم الهدية / العرض المجاني مع أزرار سريعة */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    اسم الهدية أو العرض المجاني <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={incentiveForm.rewardText}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, rewardText: e.target.value })}
                    placeholder="تحلية أو كانز هدية"
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                  />

                  {/* اقتراحات هدايا شهيرة */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 ml-1">نماذج هدايا:</span>
                    {[
                      { text: 'تحلية أو كانز هدية', icon: '🎁' },
                      { text: 'طاجن أرز معمر هدية', icon: '🍮' },
                      { text: 'كانز بيبسي مثلج مجاناً', icon: '🥤' },
                      { text: 'توصيل مجاني لطلبك', icon: '🛵' },
                      { text: 'طبق مقرمشات مخصوص', icon: '✨' }
                    ].map(preset => (
                      <button
                        key={preset.text}
                        type="button"
                        onClick={() => setIncentiveForm({ ...incentiveForm, rewardText: preset.text, rewardIcon: preset.icon })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                          incentiveForm.rewardText === preset.text
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. اختيار أيقونة الهدية (Emoji) */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    أيقونة أو رمز الهدية التعبيري (Emoji)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['🎁', '🥤', '🍮', '🛵', '👑', '✨'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIncentiveForm({ ...incentiveForm, rewardIcon: emoji })}
                        className={`py-2 rounded-xl text-lg flex items-center justify-center transition cursor-pointer border ${
                          incentiveForm.rewardIcon === emoji
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-105 shadow-sm'
                            : 'bg-slate-900 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. تضمين الهدية في رسالة الواتساب للمطبخ */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">إدراج الهدية في رسالة الواتساب</span>
                    <span className="text-[10px] text-slate-400">
                      عند اكتمال الهدية، تُكتب بوضوح في ملخص الفاتورة للمطبخ والدليفري حتى لا ينسوها
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncentiveForm({ ...incentiveForm, includeInWhatsApp: !incentiveForm.includeInWhatsApp })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                      incentiveForm.includeInWhatsApp
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {incentiveForm.includeInWhatsApp ? 'مفعل بالواتساب 🟢' : 'غير مدرج ⚪'}
                  </button>
                </div>

                {/* 5. صيغة رسالة التحفيز قبل اكتمال الهدف */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    صيغة رسالة التحفيز (قبل الوصول للمبلغ)
                  </label>
                  <input
                    type="text"
                    required
                    value={incentiveForm.preGoalMessage}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, preGoalMessage: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    💡 استخدم <code className="text-amber-400">{'{remaining}'}</code> للمبلغ المتبقي، و <code className="text-amber-400">{'{reward}'}</code> لاسم الهدية.
                  </span>
                </div>

                {/* 6. صيغة رسالة التهنئة بعد اكتمال الهدف */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    صيغة رسالة التهنئة (بعد تحقيق المبلغ)
                  </label>
                  <input
                    type="text"
                    required
                    value={incentiveForm.postGoalMessage}
                    onChange={(e) => setIncentiveForm({ ...incentiveForm, postGoalMessage: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    💡 تظهر هذه الرسالة عند وصول سلة الزبون لقيمة الهدية أو تجاوزها.
                  </span>
                </div>
              </div>

              {/* أزرار الحفظ وإشعار النجاح */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div>
                  {incentiveNotice && (
                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                      <Check className="w-4 h-4" />
                      <span>{incentiveNotice}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIncentiveForm({
                        isEnabled: true,
                        targetAmount: 75,
                        rewardText: 'تحلية أو كانز هدية',
                        rewardIcon: '🎁',
                        preGoalMessage: 'أضف بـ {remaining} ج.م إضافية للحصول على {reward}!',
                        postGoalMessage: '🎉 مبروك! حصلت على {reward} مع طلبك!',
                        includeInWhatsApp: true,
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold transition cursor-pointer"
                  >
                    استعادة الإعداد الافتراضي
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <Save className="w-4 h-4 stroke-[2.5]" />
                    <span>حفظ إعدادات عرض الهدية</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          {savedNotice && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-between animate-pulse">
              <span>✓ تم حفظ الإعدادات بنجاح</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* كارت إدارة حالة المطعم ومواعيد العمل والإجازات الأسبوعية */}
            {(() => {
              const liveStatus = computeStoreStatus(storeScheduleSettings);
              return (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                  {/* رأس الكارت */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-sm">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                          <span>حالة المطعم ومواعيد العمل والإجازات</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          التحكم بالتشغيل اليدوي أو المواعيد التلقائية وأيام العطلات
                        </p>
                      </div>
                    </div>

                    {/* شارة الحالة اللحظية الفعلية */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border shadow-sm ${
                      liveStatus.isOpen
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border-red-500/30'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${liveStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-500 animate-ping'}`}></span>
                      <span>{liveStatus.isOpen ? 'مفتوح للزبائن 🟢' : (liveStatus.reason === 'vacation' ? 'إجازة اليوم 🌴' : 'مغلق حالياً 🔴')}</span>
                    </span>
                  </div>

                  {/* اختيار وضع التشغيل: يدوي vs تلقائي بجدول المواعيد */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      طريقة تحديد حالة المطعم:
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          updateStoreScheduleSettings({ mode: 'manual' });
                          showSaveIndicator();
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          storeScheduleSettings.mode === 'manual'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>تحكم يدوي مباشر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateStoreScheduleSettings({ mode: 'auto' });
                          showSaveIndicator();
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          storeScheduleSettings.mode === 'auto'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>تلقائي حسب المواعيد</span>
                      </button>
                    </div>
                  </div>

                  {/* محتوى وضع التحكم اليدوي */}
                  {storeScheduleSettings.mode === 'manual' && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-white block">التحكم الفوري المباشر:</span>
                          <span className="text-[11px] text-slate-400">
                            {storeScheduleSettings.manualIsOpen
                              ? 'المطعم مفتوح الآن ويستقبل الطلبات على الموقع'
                              : 'المطعم مغلق مؤقتاً بأمر الإدارة ويظهر الوميض الأحمر'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            toggleStoreManualStatus();
                            showSaveIndicator();
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                            storeScheduleSettings.manualIsOpen
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                              : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30 ring-2 ring-red-500/40'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          <span>{storeScheduleSettings.manualIsOpen ? 'مفتوح الآن 🟢 (اضغط للإغلاق)' : 'مغلق مؤقتاً 🔴 (اضغط للفتح)'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* محتوى وضع المواعيد التلقائية */}
                  {storeScheduleSettings.mode === 'auto' && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                      <div className="text-[11px] text-slate-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                        💡 <strong>الوضع التلقائي مفعّل:</strong> يتم فتح وإغلاق المطعم وتغيير وميض الشريط العلوي (أخضر/أحمر) أوتوماتيكياً كل دقيقة حسب الساعات المحددة وأيام الإجازات.
                      </div>

                      {/* ساعات الفتح والإغلاق */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            وقت الفتح يومياً:
                          </label>
                          <input
                            type="time"
                            value={storeScheduleSettings.openTime || '10:00'}
                            onChange={(e) => {
                              updateStoreScheduleSettings({ openTime: e.target.value });
                              showSaveIndicator();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-black text-xs text-center focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            وقت الإغلاق ليلاً:
                          </label>
                          <input
                            type="time"
                            value={storeScheduleSettings.closeTime || '02:00'}
                            onChange={(e) => {
                              updateStoreScheduleSettings({ closeTime: e.target.value });
                              showSaveIndicator();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-black text-xs text-center focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* أيام الإجازات والعطلات الأسبوعية */}
                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            أيام الإجازات الأسبوعية (عطلة المطعم):
                          </label>
                          <span className="text-[10px] text-amber-400">
                            {storeScheduleSettings.vacationDays?.length > 0
                              ? `${storeScheduleSettings.vacationDays.length} أيام محددة`
                              : 'يعمل طوال الأسبوع بدون إجازة'}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                          {WEEK_DAYS_AR.map((day) => {
                            const isVacation = storeScheduleSettings.vacationDays?.includes(day.dayIndex);
                            return (
                              <button
                                key={day.dayIndex}
                                type="button"
                                onClick={() => {
                                  const current = storeScheduleSettings.vacationDays || [];
                                  const next = isVacation
                                    ? current.filter(d => d !== day.dayIndex)
                                    : [...current, day.dayIndex];
                                  updateStoreScheduleSettings({ vacationDays: next });
                                  showSaveIndicator();
                                }}
                                className={`py-1.5 px-1 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                                  isVacation
                                    ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-xs'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                              >
                                <span>{day.name}</span>
                                <span className="text-[9px]">{isVacation ? 'إجازة 🌴' : 'عمل 🟢'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* بيان الحالة الحالية التلقائية */}
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">الحالة التلقائية في هذه اللحظة:</span>
                        <span className={`font-black ${liveStatus.isOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                          {liveStatus.detailText}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* رسالة إغلاق مخصصة تظهر للعميل */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      رسالة تنبيه العميل عند إغلاق المطعم أو في الإجازة:
                    </label>
                    <input
                      type="text"
                      value={storeScheduleSettings.customClosedMessage || ''}
                      onChange={(e) => {
                        updateStoreScheduleSettings({ customClosedMessage: e.target.value });
                        showSaveIndicator();
                      }}
                      placeholder="المطعم مغلق حالياً، نتشرف باستقبال طلباتكم في أوقات العمل الرسمية 🌹"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              );
            })()}

            {/* كارت إعدادات وتفعيل طرق الدفع في السلة ورقم هاتف المحل */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    <span>إعدادات وتفعيل طرق الدفع في السلة:</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    التحكم في ظهورها للعميل
                  </span>
                </div>

                {/* 1. كاش عند الاستلام (دائماً مفعل وأساسي) */}
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block">كاش عند الاستلام (نقداً)</span>
                      <span className="text-[10px] text-slate-400 font-medium">طريقة الدفع الأساسية الثابتة</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                    مفعل دائماً ✓
                  </span>
                </div>

                {/* 2. محفظة كاش (فودافون كاش / اتصالات كاش) مع زر تفعيل */}
                <div className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  isWalletPaymentEnabled
                    ? 'bg-slate-950/90 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-950/40 border-slate-800 opacity-90'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        isWalletPaymentEnabled
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">الدفع عبر محفظة كاش</span>
                        <span className="text-[10px] text-slate-400">فودافون كاش، اتصالات، وي، أورنج</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        toggleWalletPayment();
                        showSaveIndicator();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        isWalletPaymentEnabled
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={isWalletPaymentEnabled ? 'إلغاء التفعيل من السلة' : 'تفعيل خيار محفظة كاش في السلة'}
                    >
                      <span>{isWalletPaymentEnabled ? 'مفعل في السلة 🟢' : 'غير مفعل (مغلق) ⚪'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>رقم المحفظة لتحويل العميل:</span>
                      <span className="text-[10px] text-slate-500">
                        {isWalletPaymentEnabled ? 'يظهر للعميل في السلة' : 'مخفي حالياً'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={walletPhoneNumber || walletPhone}
                      onChange={(e) => {
                        setWalletPhone(e.target.value);
                        setWalletPhoneNumber(e.target.value);
                        showSaveIndicator();
                      }}
                      placeholder="01000000000"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500 text-left font-mono"
                    />
                  </div>
                </div>

                {/* 3. إنستاباي (InstaPay) مع زر تفعيل */}
                <div className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  isInstapayPaymentEnabled
                    ? 'bg-slate-950/90 border-purple-500/40 ring-1 ring-purple-500/20'
                    : 'bg-slate-950/40 border-slate-800 opacity-90'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        isInstapayPaymentEnabled
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">الدفع عبر تطبيق إنستاباي (InstaPay)</span>
                        <span className="text-[10px] text-slate-400">تحويل بنكي لحظي بالمعرف IPN</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        toggleInstapayPayment();
                        showSaveIndicator();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        isInstapayPaymentEnabled
                          ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={isInstapayPaymentEnabled ? 'إلغاء التفعيل من السلة' : 'تفعيل خيار إنستاباي في السلة'}
                    >
                      <span>{isInstapayPaymentEnabled ? 'مفعل في السلة 🟢' : 'غير مفعل (مغلق) ⚪'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>معرف إنستاباي (InstaPay Handle):</span>
                      <span className="text-[10px] text-slate-500">
                        {isInstapayPaymentEnabled ? 'يظهر للعميل في السلة' : 'مخفي حالياً'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={instapayHandle || instapayId}
                      onChange={(e) => {
                        setInstapayId(e.target.value);
                        setInstapayHandle(e.target.value);
                        showSaveIndicator();
                      }}
                      placeholder="username@instapay"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-purple-500 text-left font-mono"
                    />
                  </div>
                </div>
                {/* 5. تفعيل أو إيقاف شريط الهدية التحفيزي بالسلة */}
                <div className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  incentiveForm.isEnabled
                    ? 'bg-slate-950/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'bg-slate-950/40 border-slate-800 opacity-90'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        incentiveForm.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">شريط الهدية التحفيزية في السلة (أضف بـ {incentiveForm.targetAmount} ج.م)</span>
                        <span className="text-[10px] text-slate-400">
                          {incentiveForm.isEnabled ? `مفعل (${incentiveForm.rewardText})` : 'مخفي حالياً من سلة الزبائن'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !incentiveForm.isEnabled;
                        setIncentiveForm(prev => ({ ...prev, isEnabled: next }));
                        updateCartIncentiveSettings({ isEnabled: next });
                        showSaveIndicator();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        incentiveForm.isEnabled
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={incentiveForm.isEnabled ? 'إلغاء التفعيل وإخفاء الشريط من السلة' : 'تفعيل ظهور شريط الهدية في السلة'}
                    >
                      <span>{incentiveForm.isEnabled ? 'مفعل في السلة 🟢' : 'غير مفعل (مخفي) ⚪'}</span>
                    </button>
                  </div>
                </div>

                {/* 4. تفعيل أو إيقاف نظام كوبونات الخصم في السلة */}
                <div className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  isCouponsEnabled
                    ? 'bg-slate-950/90 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-950/40 border-slate-800 opacity-90'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        isCouponsEnabled
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">نظام كوبونات الخصم في السلة</span>
                        <span className="text-[10px] text-slate-400">
                          {isCouponsEnabled ? 'خانة الكوبون ظاهرة للعملاء في السلة' : 'خانة الكوبون مخفية تماماً من السلة'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        toggleCouponsEnabled();
                        showSaveIndicator();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        isCouponsEnabled
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={isCouponsEnabled ? 'إلغاء التفعيل وإخفاء الخانة من السلة' : 'تفعيل ظهور خانة الكوبون في السلة'}
                    >
                      <span>{isCouponsEnabled ? 'مفعل في السلة 🟢' : 'غير مفعل (مخفي) ⚪'}</span>
                    </button>
                  </div>
                </div>

                {/* 4. رقم هاتف المطعم المباشر */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-slate-300 block">رقم هاتف المحل المباشر للاتصال والاستفسار</label>
                  <input
                    type="text"
                    value={restaurantPhone}
                    onChange={(e) => {
                      setRestaurantPhone(e.target.value);
                      showSaveIndicator();
                    }}
                    placeholder="01000000000"
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-rose-500 text-left font-mono"
                  />
                </div>
              </div>
            </div>

            {/* كارت التحكم في كلمة المرور لشاشة متابعة الطلبات (المطبخ / الكاشير) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>شاشة متابعة الطلبات المستقلة</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        للكاشير والمطبخ 🖥️
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      التحكم في الرقم السري المخصص لموظفي الصالة لتنفيذ الطلبات دون كشف بيانات الإدارة
                    </p>
                  </div>
                </div>
              </div>

              {monitorPassNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{monitorPassNotice}</span>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    الرقم السري الخاص بشاشة المتابعة (Monitor Password):
                  </label>
                  <div className="relative">
                    <input
                      type={showMonitorPassword ? "text" : "password"}
                      value={tempMonitorPassword}
                      onChange={(e) => setTempMonitorPassword(e.target.value)}
                      placeholder="أدخل الرقم السري للشاشة..."
                      className="w-full py-2.5 px-3.5 pr-10 pl-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-amber-400 text-left font-mono"
                    />
                    <Lock className="absolute top-3 right-3 w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowMonitorPassword(!showMonitorPassword)}
                      className="absolute top-2.5 left-2.5 p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                      title={showMonitorPassword ? "إخفاء" : "إظهار"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    * هذا الرقم يدخل به موظف المطبخ أو الكاشير لمتابعة وتأكيد أو إلغاء الطلبات فقط.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const clean = tempMonitorPassword.trim();
                      if (!clean) {
                        alert('يرجى كتابة رقم سري صالح');
                        return;
                      }
                      setMonitorPassword(clean);
                      setMonitorPassNotice('تم حفظ الرقم السري لشاشة المتابعة ومزامنته مع السيرفر بنجاح ✓');
                      setTimeout(() => setMonitorPassNotice(null), 4000);
                      showSaveIndicator();
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ وتحديث الرقم السري</span>
                  </button>

                  <Link
                    href="/admin/monitor"
                    target="_blank"
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>فتح الشاشة 🖥️</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* كارت إدارة مناطق ورسوم التوصيل لسنهور والفيوم وضواحيها - مع قفل حماية وترتيب متقن */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                    <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                        إدارة مناطق ورسوم التوصيل
                      </h3>
                      <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {currentDeliveryZones.length} منطقة
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                      سنهور، الفيوم، القرى المجاورة وإمكانية إضافة أو حذف أي منطقة
                    </p>
                  </div>
                </div>

                {/* أزرار التحكم: زر تفعيل التعديل في سطر مستقل بلون مميز، والزرين الآخرين في السطر التالي */}
                <div className="flex flex-col gap-2.5 w-full md:w-auto shrink-0">
                  {/* السطر الأول: زر قفل وتفعيل التعديل بلون مميز فخم وجذاب جداً */}
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeliveryZonesEditMode(!isDeliveryZonesEditMode);
                        showZoneNotice(!isDeliveryZonesEditMode ? 'تم فك قفل التعديل والحذف لمناطق التوصيل 🔓' : 'تم قفل التعديل لحماية بيانات التوصيل 🔒');
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 ${
                        isDeliveryZonesEditMode
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                          : 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border-2 border-amber-500/50 hover:border-amber-400 shadow-amber-500/10'
                      }`}
                      title={isDeliveryZonesEditMode ? 'قفل وضع التعديل لحماية البيانات' : 'فك القفل لتعديل الأسعار وإضافة أو حذف المناطق'}
                    >
                      {isDeliveryZonesEditMode ? (
                        <>
                          <Unlock className="w-4 h-4 text-slate-950 animate-pulse stroke-[2.5]" />
                          <span className="tracking-wide">وضع التعديل والحذف مفعّل ومفتوح الآن 🔓</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                          <span className="tracking-wide">اضغط هنا لتفعيل وضع التعديل والحذف 🔒</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* السطر الثاني: زر إضافة منطقة ثم زر ظهور أقل طلب */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {/* 1) زر إضافة منطقة جديدة */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDeliveryZonesEditMode) {
                          alert('⚠️ يرجى تفعيل وضع التعديل والحذف أولاً (الزر العلوي المميز) لإضافة مناطق جديدة');
                          return;
                        }
                        openAddZoneModal();
                      }}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                        isDeliveryZonesEditMode
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:border-slate-600'
                      }`}
                      title={isDeliveryZonesEditMode ? 'إضافة منطقة توصيل جديدة' : 'فعّل وضع التعديل للإضافة'}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>إضافة منطقة</span>
                    </button>

                    {/* 2) زر تفعيل أو تعطيل ظهور أقل طلب بكام */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDeliveryZonesEditMode) {
                          alert('⚠️ يرجى تفعيل وضع التعديل والحذف أولاً (الزر العلوي المميز) لتغيير إعداد ظهور أقل طلب');
                          return;
                        }
                        toggleMinOrderEnabled();
                        showZoneNotice(isMinOrderEnabled ? 'تم إخفاء ظهور شرط (أقل طلب) من الكروت والسلة 📴' : 'تم تفعيل ظهور شرط (أقل طلب) في الكروت والسلة ✅');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        !isDeliveryZonesEditMode
                          ? 'bg-slate-800/50 border-slate-800 text-slate-500'
                          : isMinOrderEnabled
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                      }`}
                      title={
                        !isDeliveryZonesEditMode
                          ? 'فعّل وضع التعديل لتغيير ظهور أقل طلب'
                          : 'التحكم في إظهار أو إخفاء شرط الحد الأدنى للطلب للزبائن'
                      }
                    >
                      <span className={`w-2 h-2 rounded-full ${isMinOrderEnabled ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>أقل طلب: {isMinOrderEnabled ? 'مُفعّل' : 'مُعطّل'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* تنبيه إذا كان القفل مقفولاً */}
              {!isDeliveryZonesEditMode && (
                <div className="p-2.5 rounded-xl bg-slate-950/60 text-slate-400 border border-slate-800/80 text-[11px] font-medium flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>وضع العرض فقط: لتعديل رسوم التوصيل، الإضافة، أو الحذف، اضغط على زر <strong>«تفعيل التعديل 🔒»</strong> أعلاه.</span>
                  </div>
                </div>
              )}

              {/* إشعار التعديل إن وجد */}
              {zoneNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-2 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" />
                  <span>{zoneNotice}</span>
                </div>
              )}

              {/* شريط البحث عن منطقة */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={zoneSearchQuery}
                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                  placeholder="ابحث عن قرية أو منطقة..."
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* قائمة المناطق - بتصميم كروت نظيفة ومتناسقة للشاشات الصغيرة والكبيرة */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-0.5 custom-scrollbar">
                {filteredZones.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                    لا توجد منطقة مطابقة لكلمة البحث
                  </div>
                ) : (
                  filteredZones.map(zone => (
                    <div
                      key={zone.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                    >
                      {/* بيانات المنطقة */}
                      <div className="flex items-start justify-between gap-2 sm:block sm:space-y-1 min-w-0">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                            <span className="text-xs sm:text-sm font-black text-white truncate">{zone.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                              ⏱️ {zone.estimatedMinutes || '20-30 دقيقة'}
                            </span>
                            {isMinOrderEnabled ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                                أقل طلب: <strong className="text-amber-300">{zone.minOrder} ج.م</strong>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-800/60 text-slate-500 line-through text-[10px]" title="تم تعطيل ظهور أقل طلب">
                                أقل طلب: {zone.minOrder} ج.م (مخفي)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* إشارة سريعة لسعر التوصيل تظهر بالهاتف في الجزء العلوي */}
                        <div className="sm:hidden text-left shrink-0">
                          <span className="text-[10px] text-slate-400 block">رسوم التوصيل</span>
                          <span className="text-xs font-black text-amber-300">{zone.fee} ج.م</span>
                        </div>
                      </div>

                      {/* شريط التحكم والتعديل السريع متوافق 100% مع الهاتف ومحمي بالقفل */}
                      <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                        {isDeliveryZonesEditMode ? (
                          <>
                            {/* تعديل رسوم التوصيل بأزرار سهلة للمس في الموبايل */}
                            <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
                              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">توصيل:</span>
                              <button
                                type="button"
                                onClick={() => updateZoneFee(zone.id, Math.max(0, zone.fee - 5))}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 font-black text-xs flex items-center justify-center transition cursor-pointer"
                                title="إنقاص 5 ج.م"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={zone.fee}
                                onChange={(e) => updateZoneFee(zone.id, Number(e.target.value))}
                                className="w-12 py-0.5 px-1 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-black text-xs text-center focus:outline-none focus:border-amber-400"
                                title="تعديل مباشر لرسوم التوصيل"
                              />
                              <button
                                type="button"
                                onClick={() => updateZoneFee(zone.id, zone.fee + 5)}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 font-black text-xs flex items-center justify-center transition cursor-pointer"
                                title="زيادة 5 ج.م"
                              >
                                +
                              </button>
                              <span className="text-[10px] font-bold text-slate-400 mr-0.5">ج.م</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* زر تعديل تفاصيل المنطقة */}
                              <button
                                type="button"
                                onClick={() => openEditZoneModal(zone)}
                                className="p-2 sm:p-2 rounded-xl bg-slate-900 hover:bg-amber-500/20 active:bg-amber-500/30 text-slate-300 hover:text-amber-300 border border-slate-800 transition cursor-pointer flex items-center gap-1"
                                title="تعديل اسم المنطقة وتفاصيلها"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold sm:hidden">تعديل</span>
                              </button>

                              {/* زر حذف المنطقة */}
                              <button
                                type="button"
                                onClick={() => setZoneToDelete(zone)}
                                className="p-2 sm:p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 active:bg-red-500/30 text-slate-400 hover:text-red-400 border border-slate-800 transition cursor-pointer"
                                title="حذف هذه المنطقة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          /* في وضع القفل (عرض آمن فقط) */
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-800/80 text-xs">
                              <span className="text-slate-400 text-[11px]">التوصيل:</span>
                              <span className="font-black text-amber-300">{zone.fee} ج.م</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/40 px-2 py-1 rounded-lg border border-slate-800/60">
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              <span>محمي</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* استعادة المناطق الافتراضية - محمية بالقفل أيضاً */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
                <span className="text-[10px] sm:text-[11px] text-slate-500 text-center sm:text-right">
                  تنعكس المناطق ورسومها فوراً في سلة المشتريات وتفاصيل طلب الواتساب
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDeliveryZonesEditMode) {
                      alert('⚠️ يرجى تفعيل وضع التعديل والحذف أولاً (زر القفل) لاستعادة المناطق الأصلية');
                      return;
                    }
                    if (confirm('هل تريد استعادة قائمة مناطق التوصيل الافتراضية الأصلية؟')) {
                      resetDeliveryZones();
                      showZoneNotice('تمت استعادة المناطق الافتراضية الأصلية بنجاح');
                    }
                  }}
                  className={`text-[11px] font-bold transition cursor-pointer py-1 px-2.5 rounded-lg ${
                    isDeliveryZonesEditMode
                      ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-500'
                  }`}
                  title={isDeliveryZonesEditMode ? 'استعادة المناطق الأصلية' : 'فعّل التعديل لاستعادة المناطق'}
                >
                  استعادة المناطق الأصلية
                </button>
              </div>
            </div>
          </div>

          {/* كارت إدارة رسائل إشعارات الواتساب للعملاء (تأكيد / إلغاء) */}
          <div className="bg-slate-900/90 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* رأس الكارت */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>إعدادات رسائل الواتساب التلقائية للعملاء</span>
                    </h3>
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      تأكيد وإلغاء فوري 📲
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    تخصيص نص رسائل الواتساب التي ترسل للعميل مباشرة فور الضغط على زر (تأكيد) أو (إلغاء) في شاشة الطلبات
                  </p>
                </div>
              </div>

              {/* زر التفعيل العام للإشعارات */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toggleWhatsAppNotificationEnabled();
                    showSaveIndicator();
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                    whatsappNotificationSettings?.isEnabled !== false
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                  title="تفعيل أو تعطيل إرسال رسائل الواتساب للعملاء"
                >
                  {whatsappNotificationSettings?.isEnabled !== false ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>إشعارات الواتساب: مفعلة 🟢</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span>إشعارات الواتساب: معطلة مؤقتاً ⚪</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* إشعار الحفظ المحلي */}
            {whatsappSaveNotice && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4" />
                <span>{whatsappSaveNotice}</span>
              </div>
            )}

            {/* اختيار طريقة الإرسال: يدوي (فتح الواتساب) vs تلقائي (في الخلفية عبر API) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white block">طريقة إرسال الرسالة للعميل عند التأكيد أو الإلغاء:</span>
                  <span className="text-[11px] text-slate-400">اختر الطريقة المناسبة لك (يمكنك التبديل بينهما في أي وقت)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* الخيار 1: إرسال يدوي (فتح الواتس) */}
                <div
                  onClick={() => setTempSendMode('manual')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    tempSendMode === 'manual'
                      ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-400/40 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🖐️</span>
                      <div>
                        <div className="text-xs font-black text-white">إرسال يدوي (فتح الواتساب بالرسالة)</div>
                        <div className="text-[10px] text-emerald-400 font-bold">مجاني 100% وبدون أي اشتراك</div>
                      </div>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      tempSendMode === 'manual' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                    }`}>
                      {tempSendMode === 'manual' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    يفتح تطبيق الواتساب أو الويب مع رقم العميل والرسالة مكتوبة بالكامل بضغطة زر.
                  </p>
                </div>

                {/* الخيار 2: إرسال تلقائي مباشر في الخلفية */}
                <div
                  onClick={() => setTempSendMode('auto')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    tempSendMode === 'auto'
                      ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-400/40 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <div>
                        <div className="text-xs font-black text-white">إرسال تلقائي مباشر في الخلفية (Auto API)</div>
                        <div className="text-[10px] text-amber-400 font-bold">بدون فتح الواتساب وبدون مغادرة الصفحة</div>
                      </div>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      tempSendMode === 'auto' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                    }`}>
                      {tempSendMode === 'auto' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    يرسل الرسالة مباشرة للعميل في صمت تام دون فتح أي تطبيق ودون تشتيت الكاشير.
                  </p>
                </div>
              </div>

              {/* إعدادات الربط في حالة اختيار الإرسال التلقائي */}
              {tempSendMode === 'auto' && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>بيانات ربط خدمة الواتساب (UltraMsg Gateway):</span>
                    </span>
                    <a
                      href="https://ultramsg.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>موقع الخدمة (UltraMsg.com)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Instance ID (معرّف الرقم):</label>
                      <input
                        type="text"
                        value={tempInstanceId}
                        onChange={(e) => setTempInstanceId(e.target.value)}
                        placeholder="مثال: instance12345"
                        className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Token (رمز التوكن السري):</label>
                      <input
                        type="password"
                        value={tempApiToken}
                        onChange={(e) => setTempApiToken(e.target.value)}
                        placeholder="أدخل رمز الـ Token هنا..."
                        className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* فحص واختبار الإرسال المباشر */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="tel"
                      value={testApiPhone}
                      onChange={(e) => setTestApiPhone(e.target.value)}
                      placeholder="أدخل رقم هاتف للتجربة (مثال: 01012345678)"
                      className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={isTestingApi || !tempInstanceId.trim() || !tempApiToken.trim()}
                      onClick={async () => {
                        const clean = testApiPhone.trim();
                        if (!clean) {
                          alert('يرجى إدخال رقم هاتف لإرسال الرسالة التجريبية إليه');
                          return;
                        }
                        setIsTestingApi(true);
                        setTestApiResult(null);
                        const res = await sendWhatsAppMessageApi(
                          clean,
                          '👑 *مطعم لؤلؤة سنهور*\nهذه رسالة اختبارية لتأكيد نجاح ربط الإرسال التلقائي في الخلفية بنجاح 🚀',
                          tempInstanceId,
                          tempApiToken
                        );
                        setIsTestingApi(false);
                        if (res.success) {
                          setTestApiResult({ success: true, msg: 'تم إرسال الرسالة الاختبارية بنجاح! تفقد رقم الواتساب الآن ✓' });
                        } else {
                          setTestApiResult({ success: false, msg: `فشل الإرسال: ${res.error}` });
                        }
                      }}
                      className={`w-full sm:w-auto py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                        !tempInstanceId.trim() || !tempApiToken.trim()
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                      }`}
                    >
                      {isTestingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isTestingApi ? 'جاري الإرسال التجريبي...' : 'تجربة إرسال رسالة الآن'}</span>
                    </button>
                  </div>

                  {testApiResult && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      testApiResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {testApiResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{testApiResult.msg}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* أزرار التبديل بين قالب التأكيد وقالب الإلغاء */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto p-1 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWhatsappActiveTab('confirm')}
                    className={`py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      whatsappActiveTab === 'confirm'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>قالب رسالة تأكيد الطلب 🚀</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappActiveTab('cancel')}
                    className={`py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      whatsappActiveTab === 'cancel'
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>قالب رسالة إلغاء الطلب ⚠️</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  {whatsappActiveTab === 'confirm'
                    ? 'يتم إرسالها عند الضغط على "تأكيد" في شاشة المتابعة'
                    : 'يتم إرسالها عند الضغط على "إلغاء قبل الخروج" أو "عدم استلام"'}
                </div>
              </div>

              {/* شريط المتغيرات الديناميكية القابلة للنقر للإدراج السريع */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>المتغيرات الديناميكية المتاحة (اضغط على أي متغير لإدراجه في القالب):</span>
                  </span>
                  <span className="text-[10px] text-slate-500">تستبدل تلقائياً ببيانات الطلب الفعلية</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { key: '{customer_name}', label: 'اسم العميل', desc: 'مثل: أحمد كمال' },
                    { key: '{order_id}', label: 'رقم الأوردر', desc: 'مثل: 248190' },
                    { key: '{total_amount}', label: 'المبلغ الإجمالي', desc: 'مثل: 145' },
                    { key: '{phone}', label: 'رقم الهاتف', desc: 'هاتف العميل' },
                    ...(whatsappActiveTab === 'cancel' ? [{ key: '{reason}', label: 'سبب الإلغاء', desc: 'عدم استلام / قبل الخروج' }] : []),
                    { key: '{items_count}', label: 'عدد الأصناف', desc: 'العدد الكلي للوجبات' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        if (whatsappActiveTab === 'confirm') {
                          setTempConfirmTemplate(prev => prev ? `${prev} ${v.key}` : v.key);
                        } else {
                          setTempCancelTemplate(prev => prev ? `${prev} ${v.key}` : v.key);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-xs font-mono font-bold text-emerald-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95 group shadow-xs"
                      title={`انقر لإضافة ${v.key} (${v.desc})`}
                    >
                      <Plus className="w-3 h-3 text-slate-400 group-hover:text-emerald-400" />
                      <span>{v.key}</span>
                      <span className="text-[10px] text-slate-400 font-sans font-medium">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* شبكة التحرير والمعاينة الحية للواتساب */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                {/* 1. مربع التعديل والتحرير */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      {whatsappActiveTab === 'confirm'
                        ? 'محتوى رسالة التأكيد (يمكنك تعديل أي سطر):'
                        : 'محتوى رسالة الإلغاء (يمكنك تعديل أي سطر):'}
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(whatsappActiveTab === 'confirm' ? tempConfirmTemplate : tempCancelTemplate).length} حرف
                    </span>
                  </div>

                  <textarea
                    rows={9}
                    dir="rtl"
                    value={whatsappActiveTab === 'confirm' ? tempConfirmTemplate : tempCancelTemplate}
                    onChange={(e) => {
                      if (whatsappActiveTab === 'confirm') {
                        setTempConfirmTemplate(e.target.value);
                      } else {
                        setTempCancelTemplate(e.target.value);
                      }
                    }}
                    placeholder="اكتب نص الرسالة هنا مع المتغيرات..."
                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-y"
                  />

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    💡 يمكنك استخدام نجوم للتغميق مثل <strong className="text-white font-bold">*كلمة عريضة*</strong> كما في محادثات الواتساب الرسمية.
                  </p>
                </div>

                {/* 2. بطاقة المعاينة الحية كما ستظهر في شات الواتساب */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span>معاينة حية لشكل الرسالة عند العميل:</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        واتساب 💬
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-500">مظهر المحادثة</span>
                  </div>

                  {(() => {
                    const currentTemplate = whatsappActiveTab === 'confirm' ? tempConfirmTemplate : tempCancelTemplate;
                    const sampleOrder = {
                      id: 'ord-883921',
                      customer_name: 'أحمد كمال',
                      customer_phone: '01012345678',
                      total_amount: 145,
                      items: [{ quantity: 2 }, { quantity: 1 }],
                    };
                    const formatted = formatWhatsAppNotification(
                      currentTemplate,
                      sampleOrder,
                      { reason: whatsappActiveTab === 'cancel' ? 'عدم استلام العميل للطلب' : undefined }
                    );

                    return (
                      <div className="rounded-2xl bg-[#0b141a] border border-[#202c33] p-4 min-h-[220px] flex flex-col justify-between shadow-inner relative overflow-hidden">
                        {/* خلفية بنمط الواتساب */}
                        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#25d366_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                        {/* فقاعة الرسالة الخضراء الملكية */}
                        <div className="relative z-10 max-w-[92%] mr-auto rounded-2xl rounded-tr-xs bg-[#005c4b] text-[#e9edef] p-3 sm:p-3.5 shadow-md border border-[#02735e]/60 space-y-2">
                          <div className="text-xs sm:text-[13px] font-sans leading-relaxed whitespace-pre-wrap dir-rtl select-text">
                            {formatted || 'لا يوجد نص رسالة للمعاينة'}
                          </div>

                          <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-0.5 select-none">
                            <span>الآن</span>
                            <span className="text-sky-400 font-bold">✓✓</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 text-center pt-2 relative z-10">
                          هكذا تظهر الرسالة تلقائياً في شات المحل مع العميل بمجرد نقر زر التأكيد أو الإلغاء
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* أزرار الحفظ واستعادة الافتراضي */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      updateWhatsAppNotificationSettings({
                        sendMode: tempSendMode,
                        instanceId: tempInstanceId.trim(),
                        apiToken: tempApiToken.trim(),
                        confirmTemplate: tempConfirmTemplate,
                        cancelTemplate: tempCancelTemplate,
                      });
                      setWhatsappSaveNotice('تم حفظ وتثبيت إعدادات وقوالب رسائل الواتساب ومزامنتها مع السيرفر بنجاح ✓');
                      setTimeout(() => setWhatsappSaveNotice(null), 4000);
                      showSaveIndicator();
                    }}
                    className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ إعدادات وقوالب الرسائل ومزامنة السيرفر</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (whatsappActiveTab === 'confirm') {
                        setTempConfirmTemplate(defaultConfirmNotificationTemplate);
                      } else {
                        setTempCancelTemplate(defaultCancelNotificationTemplate);
                      }
                      setWhatsappSaveNotice(`تم استعادة القالب الافتراضي لـ ${whatsappActiveTab === 'confirm' ? 'التأكيد' : 'الإلغاء'} (اضغط حفظ للتثبيت)`);
                      setTimeout(() => setWhatsappSaveNotice(null), 4000);
                    }}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    title="استعادة القالب الافتراضي الأصلي لهذه الرسالة"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>استعادة القالب الافتراضي</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 text-center sm:text-left">
                  تنعكس التعديلات فوراً على شاشة الكاشير والمطبخ
                </div>
              </div>
            </div>
          </div>

          {/* قسم إدارة خيارات وملاحظات الكشري السريعة (قائمة بدون) - أسفل الإعدادات خالص */}
          <div className="bg-slate-900/90 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>إدارة خيارات وملاحظات الكشري (قائمة بدون)</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {currentKosharyOptions.length} بنود
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      الخيارات المجهزة مسبقاً التي تظهر للزبائن في سلة الشراء عند الضغط على زر القلم لأي صنف كشري
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* زر تفعيل التعديل وزيادة الأمان */}
                <button
                  type="button"
                  onClick={() => {
                    setIsKosharyOptionsEditMode(!isKosharyOptionsEditMode);
                    if (isKosharyOptionsEditMode) {
                      setEditingOptionIndex(null);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
                    isKosharyOptionsEditMode
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white'
                  }`}
                  title={isKosharyOptionsEditMode ? 'قفل وضع التعديل' : 'تفعيل وضع التعديل والحذف'}
                >
                  {isKosharyOptionsEditMode ? (
                    <>
                      <Unlock className="w-4 h-4 text-slate-950 animate-pulse" />
                      <span>وضع التعديل مفعل 🔓</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>تفعيل وضع التعديل والحذف 🔒</span>
                    </>
                  )}
                </button>

                {kosharyOptionNotice && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-2 animate-fadeIn">
                    <Check className="w-3.5 h-3.5" />
                    <span>{kosharyOptionNotice}</span>
                  </div>
                )}
              </div>
            </div>

            {/* إضافة بند جديد للقائمة */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">
                إضافة خيار جديد للقائمة (مثال: بدون بصل، بدون عدس، بدون صلصة زيادة...):
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const text = newOptionInput.trim();
                      if (text) {
                        if (currentKosharyOptions.includes(text)) {
                          alert('هذا الخيار موجود بالفعل في القائمة!');
                          return;
                        }
                        addKosharyCustomOption(text);
                        setNewOptionInput('');
                        showKosharyNotice('تمت إضافة البند بنجاح وحفظه');
                      }
                    }
                  }}
                  placeholder="اكتب الخيار الجديد هنا واضغط إضافة..."
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = newOptionInput.trim();
                    if (!text) return;
                    if (currentKosharyOptions.includes(text)) {
                      alert('هذا الخيار موجود بالفعل في القائمة!');
                      return;
                    }
                    addKosharyCustomOption(text);
                    setNewOptionInput('');
                    showKosharyNotice('تمت إضافة البند بنجاح وحفظه');
                  }}
                  disabled={!newOptionInput.trim()}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة للقائمة</span>
                </button>
              </div>
            </div>

            {/* عرض وتعديل وحذف البنود الحالية */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block">البنود الحالية في القائمة:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentKosharyOptions.map((opt, idx) => {
                  const isEditing = editingOptionIndex === idx;

                  if (isEditing) {
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-400 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editingOptionText}
                          onChange={(e) => setEditingOptionText(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editingOptionText.trim()) {
                                updateKosharyCustomOption(idx, editingOptionText.trim());
                                setEditingOptionIndex(null);
                                showKosharyNotice('تم حفظ التعديل بنجاح');
                              }
                            } else if (e.key === 'Escape') {
                              setEditingOptionIndex(null);
                            }
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-900 border border-amber-300 text-white text-xs font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editingOptionText.trim()) {
                              updateKosharyCustomOption(idx, editingOptionText.trim());
                              setEditingOptionIndex(null);
                              showKosharyNotice('تم حفظ التعديل بنجاح');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
                          title="حفظ التعديل"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingOptionIndex(null)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="إلغاء التعديل"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2 transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="text-xs font-black text-white truncate">{opt}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isKosharyOptionsEditMode ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOptionIndex(idx);
                                setEditingOptionText(opt);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
                              title="تعديل هذا البند"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOptionToDelete({ index: idx, text: opt });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                              title="حذف هذا البند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span
                            className="text-[10px] text-slate-500 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1 cursor-default"
                            title="فعّل وضع التعديل من الزر بالأعلى للتعديل أو الحذف"
                          >
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            <span>محمي</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* رسالة التأكيد المنبثقة الفخمة لحذف الطلب */}
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            {/* إغلاق عند النقر بالخلفية */}
            <div
              className="absolute inset-0"
              onClick={() => setOrderToDelete(null)}
            />

            {/* بطاقة النافذة المنبثقة */}
            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10">
              
              {/* أيقونة تحذيرية فاخرة بهالة حمراء */}
              <div className="relative w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
                <Trash2 className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  تأكيد حذف الطلب نهائياً ⚠️
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                  هل أنت متأكد من رغبتك في إزالة هذا الطلب من سجل المطعم؟ لا يمكن استرجاع هذا الأوردر بعد حذفه.
                </p>
              </div>

              {/* بطاقة ملخص تفاصيل الطلب المراد حذفه */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-right space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">رقم الأوردر:</span>
                  <span className="text-white font-black">#{String(orderToDelete.id).slice(-6)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">اسم العميل:</span>
                  <span className="text-white font-black">{orderToDelete.customer_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">رقم الهاتف:</span>
                  <span className="text-emerald-400 font-bold">{orderToDelete.customer_phone}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 font-bold">القيمة الإجمالية:</span>
                  <span className="text-base font-black text-rose-400">{orderToDelete.total_amount} ج.م</span>
                </div>
              </div>

              {/* أزرار الإلغاء والتأكيد */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="button"
                  onClick={() => confirmDeleteOrder(orderToDelete.id)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، احذف نهائياً</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* رسالة التأكيد المنبثقة لحذف بند من قائمة بدون */}
        {optionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setOptionToDelete(null)}
            />

            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                <Trash2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  تأكيد حذف البند من قائمة الكشري ⚠️
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  هل أنت متأكد من رغبتك في إزالة خيار <strong className="text-amber-300 font-black">"{optionToDelete.text}"</strong> من قائمة الملاحظات المجهزة للكشري؟
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
                لن يظهر هذا الخيار بعد الآن للزبائن في قائمة الملاحظات التلقائية عند طلب أي صنف كشري.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOptionToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="button"
                  onClick={() => {
                    deleteKosharyCustomOption(optionToDelete.index);
                    setOptionToDelete(null);
                    showKosharyNotice('تم حذف البند بنجاح من القائمة');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، احذف البند</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* نافذة إضافة أو تعديل منطقة توصيل */}
        {isZoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsZoneModalOpen(false)}
            />

            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {editingZone ? `تعديل: ${editingZone.name}` : 'إضافة منطقة توصيل جديدة'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      حدد اسم المنطقة ورسوم التوصيل والوقت المقدر
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveZone} className="space-y-4">
                {/* اسم المنطقة */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    اسم المنطقة أو القرية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    placeholder="مثال: سنهور المدينة أو قرية ترسا أو أبشواي"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* رسوم التوصيل والحد الأدنى للطلب */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      رسوم التوصيل (ج.م) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={zoneForm.fee}
                      onChange={(e) => setZoneForm({ ...zoneForm, fee: Number(e.target.value) })}
                      placeholder="15"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950/90 border border-slate-700 text-amber-300 font-black text-xs text-center focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      أقل قيمة للطلب (ج.م) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={zoneForm.minOrder}
                      onChange={(e) => setZoneForm({ ...zoneForm, minOrder: Number(e.target.value) })}
                      placeholder="30"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950/90 border border-slate-700 text-white font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* الوقت المقدر للوصول مع أزرار سريعة */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    الوقت المقدر لوصول الطلب
                  </label>
                  <input
                    type="text"
                    value={zoneForm.estimatedMinutes}
                    onChange={(e) => setZoneForm({ ...zoneForm, estimatedMinutes: e.target.value })}
                    placeholder="مثال: 15-25 دقيقة"
                    className="w-full py-2 px-3 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />

                  {/* خيارات أوقات سريعة */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {['15-25 دقيقة', '20-30 دقيقة', '25-35 دقيقة', '30-40 دقيقة', '35-45 دقيقة'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setZoneForm({ ...zoneForm, estimatedMinutes: t })}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          zoneForm.estimatedMinutes === t
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsZoneModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء وتراجع
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingZone ? 'حفظ تعديل المنطقة' : 'إضافة المنطقة'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* نافذة تأكيد حذف منطقة توصيل */}
        {zoneToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setZoneToDelete(null)}
            />

            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-red-500/40 p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
                <Trash2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  تأكيد حذف منطقة التوصيل ⚠️
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  هل أنت متأكد من رغبتك في حذف منطقة <strong className="text-amber-400 font-black">"{zoneToDelete.name}"</strong> من قائمة مناطق التوصيل؟ لن تظهر للعملاء في السلة بعد الآن.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-right space-y-1">
                <div className="flex justify-between">
                  <span>رسوم التوصيل:</span>
                  <span className="text-amber-400 font-bold">{zoneToDelete.fee} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>الحد الأدنى للطلب:</span>
                  <span className="text-white font-bold">{zoneToDelete.minOrder} ج.م</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const name = zoneToDelete.name;
                    deleteDeliveryZone(zoneToDelete.id);
                    setZoneToDelete(null);
                    showZoneNotice(`تم حذف منطقة "${name}" بنجاح`);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، احذف المنطقة</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* نافذة إنشاء أو تعديل كوبون الخصم */}
        {isCouponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setIsCouponModalOpen(false)}
            />

            <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {editingCoupon ? `تعديل الكوبون: ${editingCoupon.code}` : 'إنشاء كوبون خصم جديد'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      حدد شروط الكوبون وقيمته ومدة صلاحيته بدقة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="space-y-4">
                {/* كود الكوبون */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    كود الكوبون (الرمز الترويجي) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="مثال: LOLO10 أو WELCOME"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950/90 border border-slate-700 text-amber-300 font-black text-sm tracking-wider uppercase focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[11px] text-slate-500">سيتم حفظ الكود بالحروف الإنجليزية الكبيرة وبدون مسافات</span>
                </div>

                {/* نوع وقيمة الخصم */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">نوع الخصم</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCouponForm({ ...couponForm, discountType: 'percentage' })}
                        className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                          couponForm.discountType === 'percentage'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>نسبة %</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCouponForm({ ...couponForm, discountType: 'fixed' })}
                        className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                          couponForm.discountType === 'fixed'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>مبلغ ثابت</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      قيمة الخصم <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={couponForm.discountType === 'percentage' ? '100' : '9999'}
                        required
                        value={couponForm.discountValue}
                        onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                        placeholder={couponForm.discountType === 'percentage' ? '10' : '25'}
                        className="w-full py-2.5 pr-3.5 pl-10 rounded-xl bg-slate-950/90 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-amber-400 text-left"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400 pointer-events-none">
                        {couponForm.discountType === 'percentage' ? '%' : 'ج.م'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* أقصى عدد لمرات الاستخدام وتاريخ الانتهاء */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      الحد الأقصى للاستخدام (مرات)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={couponForm.maxUses}
                      onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                      placeholder="غير محدود (اتركه فارغاً)"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-500">اتركه فارغاً إذا كان الكوبون غير محدد بعدد مرات</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      الحد الأدنى لقيمة الطلب (ج.م)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={couponForm.minOrderAmount}
                      onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                      placeholder="مثال: 100 ج.م (اختياري)"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-500">لن يُقبل الكوبون إن كان الأوردر أقل منه</span>
                  </div>
                </div>

                {/* تاريخ ووقت انتهاء الصلاحية */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    تاريخ ووقت انتهاء الصلاحية (اختياري)
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.expiresAt}
                    onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500">اتركه فارغاً ليكون الكوبون صالحاً دائماً دون وقت انتهاء</span>
                </div>

                {/* ملاحظة داخلية للإدارة */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    ملاحظة خاصة بالكوبون (لإدارة المطعم فقط)
                  </label>
                  <input
                    type="text"
                    value={couponForm.note}
                    onChange={(e) => setCouponForm({ ...couponForm, note: e.target.value })}
                    placeholder="مثال: عرض افتتاح فرع جديد / عميل مميز"
                    className="w-full py-2 px-3 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* حالة التفعيل الفوري */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">حالة تفعيل الكوبون</span>
                    <span className="text-[11px] text-slate-400">هل الكوبون جاهز للاستخدام من قبل الزبائن فوراً؟</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, isActive: !couponForm.isActive })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      couponForm.isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {couponForm.isActive ? 'مفعل 🟢' : 'معطل ⚪'}
                  </button>
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء وتراجع
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingCoupon ? 'حفظ تعديلات الكوبون' : 'إنشاء وحفظ الكوبون'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* نافذة تأكيد حذف كوبون الخصم */}
        {couponToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              className="absolute inset-0"
              onClick={() => setCouponToDelete(null)}
            />

            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-red-500/40 p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
                <Trash2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">
                  تأكيد حذف الكوبون نهائياً ⚠️
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  هل أنت متأكد من حذف الكود الترويجي <strong className="text-amber-400 font-mono font-black">{couponToDelete.code}</strong>؟ لن يتمكن أي عميل من استخدامه بعد الآن.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-right space-y-1">
                <div className="flex justify-between">
                  <span>نوع الخصم:</span>
                  <span className="text-white font-bold">{couponToDelete.discountType === 'percentage' ? `${couponToDelete.discountValue}%` : `${couponToDelete.discountValue} ج.م`}</span>
                </div>
                <div className="flex justify-between">
                  <span>مرات الاستخدام السابقة:</span>
                  <span className="text-white font-bold">{couponToDelete.usedCount || 0} مرة</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCouponToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="button"
                  onClick={() => {
                    deleteCoupon(couponToDelete.id);
                    const code = couponToDelete.code;
                    setCouponToDelete(null);
                    showCouponNotice(`تم حذف الكوبون ${code} بنجاح`);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، احذف الكوبون</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* إشعار نجاح الحذف المنبثق */}
        {deleteNotice && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white font-black text-xs shadow-2xl border border-red-500/40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>{deleteNotice}</span>
          </div>
        )}

      </main>
    </div>
  );
}
