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
  XCircle
} from 'lucide-react';
import { Coupon, DeliveryZone, StoreScheduleSettings } from '@/types';
import { restaurantInfo as defaultInfo, menuItems as defaultMenuItems, deliveryZones as defaultZones } from '@/data/mockData';
import { fetchOrdersFromDatabase, updateOrderStatusInDb, deleteOrderFromDatabase } from '@/lib/supabase';
import { MenuManagementTab } from '@/components/admin/MenuManagementTab';
import { useMenuStore, defaultKosharyCustomOptions, defaultCartIncentiveSettings, defaultStoreScheduleSettings, computeStoreStatus, WEEK_DAYS_AR } from '@/lib/menuStore';


export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'coupons' | 'settings'>('orders');

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
  } = useMenuStore();

  const [tempMonitorPassword, setTempMonitorPassword] = useState(monitorPassword || 'sanhour123');
  const [showMonitorPassword, setShowMonitorPassword] = useState(false);
  const [monitorPassNotice, setMonitorPassNotice] = useState<string | null>(null);

  useEffect(() => {
    if (monitorPassword) {
      setTempMonitorPassword(monitorPassword);
    }
  }, [monitorPassword]);

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
      const data = await fetchOrdersFromDatabase();
      setOrders(data || []);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
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
    await updateOrderStatusInDb(orderId, newStatus);
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
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
            {/* المربعات الإحصائية العلوية: 1. إجمالي المبيعات المؤكدة - 2. عدد الأوردرات المؤكدة - 3. الأوردرات الملغية وإجمالي مبلغها */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* المربع الأول: إجمالي المبيعات المؤكدة - خلفية زمردية فخمة تدل على الأرباح والسيولة المحققة */}
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
                  <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-emerald-300 tracking-tight drop-shadow-sm">
                    {confirmedRevenue.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-400">جنيه مصري</span>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-200/70 font-medium pt-3.5 border-t border-emerald-500/20 relative z-10">
                  <span className="flex items-center gap-1.5">
                    <span>💰</span>
                    <span>قيمة الطلبات المؤكدة فقط</span>
                  </span>
                  <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                    {confirmedOrders.length} طلب مؤكد
                  </span>
                </div>
              </div>

              {/* المربع الثاني: عدد الأوردرات المؤكدة ونشاط الزبائن - خلفية ياقوتية ملكية تدل على حركة الطلبات المؤكدة */}
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
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-300 tracking-tight drop-shadow-sm">
                      {confirmedOrders.length.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-sm sm:text-base font-black text-indigo-400">أوردر</span>
                  </div>

                  {/* كام شخص طلب؟ */}
                  <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl px-3 py-1.5 text-left shrink-0 shadow-inner">
                    <div className="text-[10px] text-indigo-200/80 font-bold flex items-center gap-1 justify-end">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>كام شخص طلب؟</span>
                    </div>
                    <div className="text-sm sm:text-lg font-black text-amber-300 text-right">
                      {uniqueConfirmedCustomerCount.toLocaleString('ar-EG')} <span className="text-xs text-indigo-200/60 font-medium">عميل</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-indigo-200/70 font-medium pt-3.5 border-t border-indigo-500/20 relative z-10">
                  <span className="flex items-center gap-1.5">
                    <span>👥</span>
                    <span>عملاء الطلبات المؤكدة</span>
                  </span>
                  <span className="text-amber-300 font-bold bg-slate-950/60 px-2.5 py-1 rounded-xl border border-indigo-500/30">
                    من {uniqueConfirmedCustomerCount} شخص مختلف
                  </span>
                </div>
              </div>

              {/* المربع الثالث: الطلبات الملغية وإجمالي مبالغها - خلفية قرمزية/حمراء تحذيرية أنيقة */}
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
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-white to-rose-300 tracking-tight drop-shadow-sm">
                      {cancelledRevenue.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-sm sm:text-base font-black text-rose-400">جنيه</span>
                  </div>

                  {/* عدد الطلبات الملغية */}
                  <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl px-3 py-1.5 text-left shrink-0 shadow-inner">
                    <div className="text-[10px] text-rose-200/80 font-bold flex items-center gap-1 justify-end">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>عدد الملغي</span>
                    </div>
                    <div className="text-sm sm:text-lg font-black text-rose-300 text-right">
                      {cancelledOrders.length.toLocaleString('ar-EG')} <span className="text-xs text-rose-200/60 font-medium">أوردر</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-rose-200/70 font-medium pt-3.5 border-t border-rose-500/20 relative z-10">
                  <span className="flex items-center gap-1.5">
                    <span>🚫</span>
                    <span>قيمة المبيعات غير المحصلة</span>
                  </span>
                  <span className="text-rose-300 font-bold bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-500/30">
                    {cancelledOrders.length} طلب ملغي
                  </span>
                </div>
              </div>

            </div>

        {/* وحدة الفلترة التفاعلية وقائمة الطلبات الحية */}
        <div className="space-y-4">
            
            {/* وحدة الفلترة التفاعلية: اليوم، الأسبوع، الشهر، السنة، من تاريخ إلى تاريخ، والأسماء ورقم الهاتف */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
              
              {/* السطر الأول: فلاتر الوقت (اليوم، الأسبوع، الشهر، السنة، الكل، فترة مخصصة) */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                  <Calendar className="w-4 h-4 text-rose-500" />
                  <span>تصفية حسب الوقت:</span>
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

              {/* السطر الثاني: إذا تم اختيار فترة مخصصة (من يوم كذا لكذا) */}
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

              {/* السطر الثالث: فلتر الأسماء ورقم الهاتف وزر التحديث */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* البحث بالاسم أو رقم الهاتف */}
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
                      className="absolute top-2.5 left-3 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* مؤشر عدد النتائج وزر التحديث */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-xs text-slate-400 font-bold bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                    النتائج: <span className="text-white font-black">{filteredOrders.length}</span> طلب • <span className="text-amber-400 font-black">{uniqueCustomerCount}</span> عميل
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

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-300">لا توجد طلبات مسجلة حالياً</h3>
                <p className="text-xs text-slate-500">ستظهر أي طلبات جديدة يقوم العملاء بتأكيدها هنا فوراً مع إمكانية تعديل الحالة والتواصل معهم.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
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
                            <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800">
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

                      {/* زر حذف الطلب بدلاً من قيد الانتظار */}
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
                          <span className="text-base font-black text-rose-400">{order.total_amount} ج.م</span>
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
                        <a href={`https://wa.me/2${order.customer_phone.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold transition text-xs">
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
