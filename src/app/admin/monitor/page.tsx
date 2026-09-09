'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Search,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Eye,
  LogOut,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronLeft,
  X,
  Sparkles,
  MapPin,
  Utensils,
  Bike,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  DollarSign,
  ShoppingBag,
  Users,
  Wallet,
  Coins,
  PackageCheck,
  Ban,
  TrendingUp,
  UserCheck,
  Receipt,
  Unlock,
  FileText,
  CalendarCheck,
  Check
} from 'lucide-react';
import { fetchOrdersFromDatabase, updateOrderStatusInDb, isSupabaseConfigured, supabase, fetchShiftsData, closeShiftInDatabase } from '@/lib/supabase';
import { useMenuStore } from '@/lib/menuStore';
import { sounds } from '@/lib/sound';
import { openWhatsAppChat, formatWhatsAppNotification, defaultConfirmNotificationTemplate, defaultCancelNotificationTemplate, sendWhatsAppMessageApi } from '@/lib/whatsapp';
import { ClosedShift } from '@/types';

export default function OrderMonitorPage() {
  const { monitorPassword = 'sanhour123', syncWithServer, whatsappNotificationSettings } = useMenuStore();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Shift Management State
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>([]);
  const [currentShiftStartTime, setCurrentShiftStartTime] = useState<string>('');
  const [currentShiftNumber, setCurrentShiftNumber] = useState<number>(1);
  const [archivedOrderIds, setArchivedOrderIds] = useState<string[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled_before_dispatch' | 'cancelled_not_received'>('all');
  const [actionNotice, setActionNotice] = useState<{ msg: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [selectedItemNote, setSelectedItemNote] = useState<{ title: string; without?: string; notes?: string } | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [unlockedOrderIds, setUnlockedOrderIds] = useState<Set<string>>(new Set());
  const [unlockModalOrder, setUnlockModalOrder] = useState<any | null>(null);
  const [monitorTheme, setMonitorTheme] = useState<'light' | 'dark'>('light');
  const isLight = monitorTheme === 'light';

  const prevOrdersCountRef = useRef<number>(0);

  // Sync settings & check existing auth on mount
  useEffect(() => {
    syncWithServer();

    // Check if session exists in localStorage
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('loloat_monitor_auth');
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      const savedTheme = localStorage.getItem('loloat_monitor_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setMonitorTheme(savedTheme);
      }
    }

    // Live clock timer
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, [syncWithServer]);

  // Load orders and shifts when authenticated
  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const [shiftsInfo, data] = await Promise.all([
        fetchShiftsData(),
        fetchOrdersFromDatabase(),
      ]);

      if (shiftsInfo) {
        setClosedShifts(shiftsInfo.closedShifts || []);
        setCurrentShiftStartTime(shiftsInfo.currentShiftStartTime || '');
        setCurrentShiftNumber(shiftsInfo.currentShiftNumber || 1);
        setArchivedOrderIds(shiftsInfo.archivedOrderIds || []);
      }

      if (data && Array.isArray(data)) {
        const archivedSet = new Set((shiftsInfo?.archivedOrderIds || archivedOrderIds).map(String));
        const activeData = data.filter(o => !archivedSet.has(String(o.id)));
        if (soundEnabled && prevOrdersCountRef.current > 0 && activeData.length > prevOrdersCountRef.current) {
          sounds.playAddChime();
        }
        prevOrdersCountRef.current = activeData.length;
        setOrders(data);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();

      // Poll every 20 seconds as a reliable background fallback
      const pollTimer = setInterval(() => {
        loadOrders(true);
      }, 20000);

      // Realtime listener via Supabase if configured
      let channel: any = null;
      if (isSupabaseConfigured && supabase) {
        channel = supabase
          .channel('orders-monitor-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              loadOrders(true);
              if (soundEnabled) {
                sounds.playAddChime();
              }
            }
          )
          .subscribe();
      }

      return () => {
        clearInterval(pollTimer);
        if (channel && supabase) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [isAuthenticated, soundEnabled]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const targetPassword = (monitorPassword || 'sanhour123').trim();
    const input = passwordInput.trim();

    // Accept either the monitorPassword OR master admin default as fallback
    if (input === targetPassword || input === 'sanhour2026') {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('loloat_monitor_auth', 'true');
      }
      setPasswordInput('');
    } else {
      setAuthError('الرقم السري غير صحيح، يرجى مراجعة إدارة المطعم');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loloat_monitor_auth');
    }
    setIsAuthenticated(false);
  };

  const showNotice = (msg: string, type: 'success' | 'warn' | 'error') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Action Buttons Handler (تأكيد أو إلغاء)
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: 'confirmed' | 'cancelled_before_dispatch' | 'cancelled_not_received',
    statusLabel: string
  ) => {
    // العثور على بيانات الطلب الحالية لإرسال رسالة الواتساب للعميل
    const targetOrder = orders.find(o => o.id === orderId);

    // 1. تحديث فوري للحالة محلياً بدون أي تأخير
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
    sounds.playSuccessChime();

    // Always lock the order upon action (confirm or cancel)
    setUnlockedOrderIds(prev => {
      const next = new Set(prev);
      next.delete(String(orderId));
      return next;
    });

    // 2. إرسال رسالة الواتساب للعميل (إما يدوياً بفتح الشات أو تلقائياً في الخلفية)
    const isNotificationEnabled = whatsappNotificationSettings?.isEnabled ?? true;
    const sendMode = whatsappNotificationSettings?.sendMode || 'manual';
    const instanceId = (whatsappNotificationSettings?.instanceId || '').trim();
    const apiToken = (whatsappNotificationSettings?.apiToken || '').trim();

    let whatsAppOutcome: 'manual' | 'auto_success' | 'auto_fallback_manual' | 'none' = 'none';

    if (isNotificationEnabled && targetOrder?.customer_phone) {
      let msg = '';
      if (newStatus === 'confirmed') {
        const template = whatsappNotificationSettings?.confirmTemplate || defaultConfirmNotificationTemplate;
        msg = formatWhatsAppNotification(template, targetOrder, { reason: 'تم التأكيد' });
      } else if (newStatus === 'cancelled_not_received' || newStatus === 'cancelled_before_dispatch') {
        const reason = newStatus === 'cancelled_not_received' ? 'عدم استلام' : 'إلغاء قبل الخروج';
        const template = whatsappNotificationSettings?.cancelTemplate || defaultCancelNotificationTemplate;
        msg = formatWhatsAppNotification(template, targetOrder, { reason });
      }

      if (msg) {
        if (sendMode === 'auto' && instanceId && apiToken) {
          // الوضع التلقائي المباشر في الخلفية عبر API
          whatsAppOutcome = 'auto_success';
          sendWhatsAppMessageApi(targetOrder.customer_phone, msg, instanceId, apiToken)
            .then(res => {
              if (!res.success) {
                console.warn('[Auto WhatsApp Failed]:', res.error);
                showNotice(`⚠️ تعذر الإرسال التلقائي للواتساب (${res.error})، يرجى مراجعة بيانات الربط في الإعدادات`, 'warn');
              }
            })
            .catch(e => console.warn(e));
        } else {
          // الوضع اليدوي المعتاد: فتح محادثة الواتساب مع الرسالة الجاهزة
          openWhatsAppChat(targetOrder.customer_phone, msg);
          whatsAppOutcome = 'manual';
        }
      }
    }

    if (newStatus === 'confirmed') {
      showNotice(
        whatsAppOutcome === 'auto_success'
          ? `تم تأكيد الأوردر #${String(orderId).slice(-6)} وإرسال إشعار الواتساب تلقائياً في الخلفية ⚡🔒`
          : whatsAppOutcome === 'manual'
          ? `تم تأكيد الأوردر #${String(orderId).slice(-6)} وفتح رسالة الواتساب للعميل 📲🔒`
          : `تم تأكيد الأوردر #${String(orderId).slice(-6)} وقفله بنجاح 🔒`,
        'success'
      );
    } else if (newStatus === 'cancelled_before_dispatch') {
      showNotice(
        whatsAppOutcome === 'auto_success'
          ? `تم تسجيل إلغاء الأوردر #${String(orderId).slice(-6)} وإرسال إشعار الواتساب تلقائياً ⚡🔒`
          : whatsAppOutcome === 'manual'
          ? `تم تسجيل إلغاء الأوردر #${String(orderId).slice(-6)} وفتح رسالة الواتساب للعميل 📲🔒`
          : `تم تسجيل إلغاء الأوردر #${String(orderId).slice(-6)} وقفله بنجاح 🔒`,
        'warn'
      );
    } else {
      showNotice(
        whatsAppOutcome === 'auto_success'
          ? `تم تسجيل عدم استلام الأوردر #${String(orderId).slice(-6)} وإرسال إشعار الواتساب تلقائياً ⚡🔒`
          : whatsAppOutcome === 'manual'
          ? `تم تسجيل عدم استلام الأوردر #${String(orderId).slice(-6)} وفتح رسالة الواتساب للعميل 📲🔒`
          : `تم تسجيل عدم استلام الأوردر #${String(orderId).slice(-6)} وقفله بنجاح 🔒`,
        'error'
      );
    }

    // 3. الحفظ الدائم في السيرفر والسحابة والتخزين المحلي
    try {
      await updateOrderStatusInDb(orderId, newStatus);
    } catch (err: any) {
      console.warn('Background status sync error:', err);
    }
  };

  // الطلبات التابعة للوردية الحالية المفتوحة فقط (المستثنى منها الورديات المقفلة السابقة)
  const currentShiftOrders = useMemo(() => {
    const archivedSet = new Set(archivedOrderIds.map(String));
    return orders.filter(o => !archivedSet.has(String(o.id)));
  }, [orders, archivedOrderIds]);

  // Filter orders by phone, name, and status (للواردة الحالية فقط)
  const filteredOrders = useMemo(() => {
    return currentShiftOrders.filter(order => {
      // 1. Search Query Filter (Phone or Name)
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const nameMatch = (order.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (order.customer_phone || '').includes(q);
        const addressMatch = (order.delivery_address || '').toLowerCase().includes(q);
        const idMatch = String(order.id || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !addressMatch && !idMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'pending') {
        return order.status === 'pending' || !order.status;
      }
      if (statusFilter === 'confirmed') {
        return order.status === 'confirmed' || order.status === 'preparing';
      }
      if (statusFilter === 'cancelled_before_dispatch') {
        return order.status === 'cancelled_before_dispatch';
      }
      if (statusFilter === 'cancelled_not_received') {
        return order.status === 'cancelled_not_received';
      }

      return true;
    });
  }, [currentShiftOrders, searchQuery, statusFilter]);

  // Counts by status للوردية الحالية
  const counts = useMemo(() => {
    return {
      all: currentShiftOrders.length,
      pending: currentShiftOrders.filter(o => o.status === 'pending' || !o.status).length,
      confirmed: currentShiftOrders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
      cancelled_before: currentShiftOrders.filter(o => o.status === 'cancelled_before_dispatch').length,
      cancelled_not_received: currentShiftOrders.filter(o => o.status === 'cancelled_not_received').length,
    };
  }, [currentShiftOrders]);

  // 1. إحصائيات المبيعات المؤكدة للوردية الحالية
  const confirmedOrders = useMemo(() => {
    return currentShiftOrders.filter(o => o.status === 'confirmed' || o.status === 'preparing');
  }, [currentShiftOrders]);

  const confirmedRevenue = useMemo(() => {
    return confirmedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [confirmedOrders]);

  const uniqueConfirmedCustomers = useMemo(() => {
    const set = new Set(
      confirmedOrders.map(o => (o.customer_phone || o.customer_name || '').trim()).filter(Boolean)
    );
    return set.size;
  }, [confirmedOrders]);

  // 2. إحصائيات الطلبات الملغية للوردية الحالية
  const cancelledOrders = useMemo(() => {
    return currentShiftOrders.filter(o =>
      o.status === 'cancelled_not_received' ||
      o.status === 'cancelled_before_dispatch' ||
      o.status === 'cancelled' ||
      (typeof o.status === 'string' && o.status.startsWith('cancelled'))
    );
  }, [currentShiftOrders]);

  const cancelledRevenue = useMemo(() => {
    return cancelledOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [cancelledOrders]);

  // ملخص الوردية الحالية للتقفيل
  const shiftSummary = useMemo(() => {
    const active = currentShiftOrders;
    const confirmed = active.filter(o => o.status === 'confirmed' || o.status === 'preparing');
    const cancelled = active.filter(o => typeof o.status === 'string' && o.status.startsWith('cancelled'));
    const pending = active.filter(o => o.status === 'pending' || !o.status);

    const totalRev = confirmed.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const cancelRev = cancelled.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    let cash = 0;
    let wallet = 0;
    let instapay = 0;
    let delivery = 0;
    let pickup = 0;

    confirmed.forEach(o => {
      const amount = Number(o.total_amount) || 0;
      const pm = o.payment_method;
      if (pm === 'cash' || !pm) cash += amount;
      else if (pm === 'vodafone_cash' || pm === 'wallet') wallet += amount;
      else if (pm === 'instapay') instapay += amount;
      else cash += amount;

      if (o.order_type === 'delivery') delivery += 1;
      else pickup += 1;
    });

    return {
      activeOrders: active,
      totalOrders: active.length,
      confirmedOrders: confirmed.length,
      cancelledOrders: cancelled.length,
      pendingOrders: pending.length,
      totalRevenue: totalRev,
      totalCancelledRevenue: cancelRev,
      cashAmount: cash,
      walletAmount: wallet,
      instapayAmount: instapay,
      deliveryCount: delivery,
      pickupCount: pickup,
    };
  }, [currentShiftOrders]);

  // تنفيذ تقفيل الوردية
  const handleConfirmCloseShift = async () => {
    if (shiftSummary.activeOrders.length === 0) {
      alert('الوردية الحالية فارغة بالفعل ولا تحتوي على أي فواتير لتقفيلها!');
      return;
    }
    setIsClosingShift(true);
    try {
      const nowIso = new Date().toISOString();
      const newShiftNum = currentShiftNumber + 1;
      const newArchivedIds = [
        ...archivedOrderIds,
        ...shiftSummary.activeOrders.map(o => String(o.id))
      ];

      const closedShiftRecord: ClosedShift = {
        id: `shift-${Date.now()}-${currentShiftNumber}`,
        shiftNumber: currentShiftNumber,
        openedAt: currentShiftStartTime || nowIso,
        closedAt: nowIso,
        closedBy: 'شاشة المتابعة',
        orderIds: shiftSummary.activeOrders.map(o => String(o.id)),
        orders: JSON.parse(JSON.stringify(shiftSummary.activeOrders)),
        summary: {
          totalOrders: shiftSummary.totalOrders,
          confirmedOrders: shiftSummary.confirmedOrders,
          cancelledOrders: shiftSummary.cancelledOrders,
          pendingOrders: shiftSummary.pendingOrders,
          totalRevenue: shiftSummary.totalRevenue,
          totalCancelledRevenue: shiftSummary.totalCancelledRevenue,
          cashAmount: shiftSummary.cashAmount,
          walletAmount: shiftSummary.walletAmount,
          instapayAmount: shiftSummary.instapayAmount,
          deliveryCount: shiftSummary.deliveryCount,
          pickupCount: shiftSummary.pickupCount,
        }
      };

      await closeShiftInDatabase(closedShiftRecord, nowIso, newShiftNum, newArchivedIds);

      // تصفير فوري للفواتير في شاشة المتابعة وتحديث الأرقام
      setArchivedOrderIds(newArchivedIds);
      setCurrentShiftStartTime(nowIso);
      setCurrentShiftNumber(newShiftNum);
      setClosedShifts(prev => [closedShiftRecord, ...prev]);
      setIsShiftModalOpen(false);

      sounds.playSuccessChime();
      showNotice(`تم تقفيل الوردية رقم #${currentShiftNumber} بنجاح وتصفير الفواتير لبدء الوردية #${newShiftNum} 🔒✓`, 'success');
    } catch (err: any) {
      console.error('Error closing shift:', err);
      alert('حدث خطأ أثناء تقفيل الوردية: ' + (err.message || err));
    } finally {
      setIsClosingShift(false);
    }
  };

  const formatOrderTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const getTimeAgo = (isoString: string) => {
    try {
      const diffMs = currentTime.getTime() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      const diffHours = Math.floor(diffMins / 60);
      return `منذ ${diffHours} ساعة`;
    } catch {
      return '';
    }
  };

  // Helper to parse order details (items and customer notes)
  const parseOrderDetails = (specialNotes?: string) => {
    if (!specialNotes || !specialNotes.trim()) {
      return { items: [], notes: '' };
    }

    const raw = specialNotes.trim();
    let itemsPart = raw;
    let notesPart = '';

    // Extract customer notes
    if (raw.includes('ملاحظات العميل:')) {
      const parts = raw.split('ملاحظات العميل:');
      itemsPart = parts[0];
      notesPart = parts.slice(1).join('ملاحظات العميل:').trim();
    } else if (raw.includes('ملاحظات الأوردر:')) {
      const parts = raw.split('ملاحظات الأوردر:');
      itemsPart = parts[0];
      notesPart = parts.slice(1).join('ملاحظات الأوردر:').trim();
    }

    // Clean items title
    itemsPart = itemsPart.replace(/^الأصناف:\s*/i, '').trim();

    // Extract items line by line
    const itemsList = itemsPart
      ? itemsPart.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    return { items: itemsList, notes: notesPart };
  };

  // Structured parser for each item line: "اسم الصنف × الكمية [خيارات] — السعر ج.م"
  const parseItemLine = (itemStr: string) => {
    const clean = itemStr.replace(/^\d+[\.\-]\s*/, '').replace(/^[•\-]\s*/, '').trim();

    // 1. Extract trailing price after " — "
    let nameAndDetails = clean;
    let price: string | null = null;
    if (clean.includes(' — ')) {
      const parts = clean.split(' — ');
      nameAndDetails = parts.slice(0, -1).join(' — ').trim();
      price = parts[parts.length - 1].trim();
    }

    // 2. Extract bracketed details [ ... ]
    let detailsStr = '';
    const bracketMatch = nameAndDetails.match(/\[(.*?)\]/);
    if (bracketMatch) {
      detailsStr = bracketMatch[1].trim();
      nameAndDetails = nameAndDetails.replace(/\[.*?\]/, '').trim();
    }

    // 3. Extract quantity e.g. "× 2" or "x1"
    let quantity = '1';
    const qtyMatch = nameAndDetails.match(/[×xX]\s*(\d+)/);
    if (qtyMatch) {
      quantity = qtyMatch[1];
      nameAndDetails = nameAndDetails.replace(/[×xX]\s*\d+/, '').trim();
    }

    const isCustom = nameAndDetails.includes('طاجن مبتكر') || detailsStr.includes('الأساس:') || detailsStr.includes('أساس:');

    // 4. Extract size or protein from parentheses
    let size: string | undefined = undefined;
    let proteinFromTitle: string | undefined = undefined;

    const parenMatch = nameAndDetails.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const inside = parenMatch[1].trim();
      if (isCustom) {
        proteinFromTitle = inside;
      } else {
        size = inside;
      }
      nameAndDetails = nameAndDetails.replace(/\([^)]+\)/, '').trim();
    }

    const name = isCustom ? 'طاجن مبتكر خاص' : nameAndDetails.trim();

    // 5. Parse details segments
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
            const clean = item.replace(/^(ملاحظات|ملاحظة):?\s*/, '').replace(/[:،]/g, '').trim();
            if (clean) notesSet.add(clean);
          });
        } else if (seg.startsWith('بدون:')) {
          const rawList = seg.replace(/^بدون:\s*/, '').split(/[،,]/);
          rawList.forEach(item => {
            const clean = item.replace(/بدون/g, '').replace(/[:،]/g, '').trim();
            if (clean) withoutSet.add(clean);
          });
        } else if (seg.includes('بدون')) {
          const rawList = seg.split(/[،,]/);
          rawList.forEach(item => {
            if (item.includes('بدون')) {
              const clean = item.replace(/بدون/g, '').replace(/[:،]/g, '').trim();
              if (clean) withoutSet.add(clean);
            } else {
              const clean = item.trim();
              if (clean) notesSet.add(clean);
            }
          });
        } else {
          const rawList = seg.split(/[،,]/);
          rawList.forEach(item => {
            const clean = item.trim();
            if (clean) notesSet.add(clean);
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

    // Parse individual extras into a list
    const extrasList = extras
      ? extras.split(/[،,•]/).map(s => s.trim()).filter(Boolean)
      : [];

    return {
      name,
      quantity,
      size,
      price,
      isCustom,
      base,
      without,
      protein,
      spice,
      extras,
      extrasList,
      notes,
      raw: clean
    };
  };

  // Render Loading Screen
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-sm font-bold text-slate-300">جار تهيئة شاشة المتابعة...</span>
        </div>
      </div>
    );
  }

  // Render Login Card
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
        {/* Background luxury lighting */}
        <div className="absolute w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none -top-20 -right-20" />
        <div className="absolute w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[130px] pointer-events-none -bottom-20 -left-20" />

        <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 z-10">
          
          {/* Logo with gold medallion glow */}
          <div className="relative w-22 h-22 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-xl flex items-center justify-center">
            <div className="relative w-full h-full rounded-full bg-[#dc0b07] border-2 border-white/40 overflow-hidden flex items-center justify-center shadow-inner">
              <Image src="/logo-transparent.png" alt="لؤلؤة سنهور" fill className="object-contain p-2" priority />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black mb-2">
              <span>🖥️ شاشة متابعة وتنفيذ الطلبات</span>
            </div>
            <h1 className="text-2xl font-black text-white">بوابة الصالة والمطبخ</h1>
            <p className="text-xs text-slate-400 mt-1">
              أدخل الرقم السري المخصص لشاشة المتابعة لتأكيد الطلبات وإلغائها لحظياً
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                الرقم السري لشاشة المتابعة:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3.5 px-4 pr-11 pl-11 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-bold transition text-left font-mono"
                  autoFocus
                />
                <Lock className="absolute top-3.5 right-3.5 w-5 h-5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 left-3 p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                  title={showPassword ? "إخفاء" : "إظهار"}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold text-right">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>دخول شاشة المتابعة</span>
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-center text-xs text-slate-400">
            <Link href="/" className="hover:text-white transition flex items-center gap-1 font-medium">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>العودة لصفحة الزوار والقائمة الرئيسية</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Monitor View
  return (
    <div className={`min-h-screen selection:bg-amber-500 selection:text-slate-950 pb-24 transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Top Floating Notification Toast */}
      {actionNotice && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-black flex items-center gap-2 border animate-in fade-in slide-in-from-top-4 duration-300 ${
          actionNotice.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30'
            : actionNotice.type === 'warn'
            ? 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30'
            : 'bg-red-600 text-white border-red-400 shadow-red-600/30'
        }`}>
          {actionNotice.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {actionNotice.type === 'warn' && <AlertTriangle className="w-4 h-4" />}
          {actionNotice.type === 'error' && <XCircle className="w-4 h-4" />}
          <span>{actionNotice.msg}</span>
        </div>
      )}

      {/* Top Navbar Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-2.5 sm:px-6 py-2.5 sm:py-3 transition-colors duration-200 ${
        isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-slate-900/95 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          
          {/* Top Row / Right Brand Info */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#dc0b07] border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-md shrink-0">
                <Image src="/logo-transparent.png" alt="لؤلؤة سنهور" fill className="object-contain p-1" priority />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className={`text-sm sm:text-base font-black whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    شاشة متابعة الطلبات 🖥️
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>مباشر</span>
                  </span>
                </div>
                <p className={`text-[10px] sm:text-xs hidden sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  متابعة وتأكيد طلبات الزبائن وإلغائها لحظياً • مطعم لؤلؤة سنهور
                </p>
              </div>
            </div>

            {/* Mobile-only Live Clock next to brand */}
            <div className={`flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-xl border font-mono text-[11px] font-bold shadow-xs ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700/80 text-amber-300'
            }`}>
              <Clock className={`w-3 h-3 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>{currentTime.toLocaleTimeString('ar-EG', { hour12: true })}</span>
            </div>
          </div>

          {/* Action Buttons & Desktop Clock: 100% visible on all screens */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            
            {/* Desktop Live Clock Badge */}
            <div className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono text-xs font-bold shadow-xs ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700/80 text-amber-300'
            }`}>
              <Clock className={`w-4 h-4 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>{currentTime.toLocaleTimeString('ar-EG', { hour12: true })}</span>
            </div>

            {/* Day / Night Theme Mode Toggle (الوضع النهاري / الليلي) */}
            <button
              type="button"
              onClick={() => {
                const next = isLight ? 'dark' : 'light';
                setMonitorTheme(next);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('loloat_monitor_theme', next);
                }
              }}
              className={`py-2 px-3 sm:px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs shrink-0 ${
                isLight
                  ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 border-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
              title={isLight ? 'التبديل إلى الوضع الليلي 🌙' : 'التبديل إلى الوضع النهاري ☀️ (أبيض)'}
            >
              {isLight ? (
                <>
                  <Moon className="w-4 h-4 text-slate-800 shrink-0" />
                  <span className="text-xs font-bold whitespace-nowrap">نهاري ☀️</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold whitespace-nowrap">ليلي 🌙</span>
                </>
              )}
            </button>

            {/* Sound Alerts Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex-1 sm:flex-none py-2 px-3 sm:px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                soundEnabled
                  ? isLight
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title={soundEnabled ? 'تنبيه الصوت مفعل للطلبات الجديدة' : 'تنبيه الصوت مكتوم'}
            >
              {soundEnabled ? (
                <Volume2 className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="text-xs font-bold whitespace-nowrap">{soundEnabled ? 'صوت 🔊' : 'صامت 🔇'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadOrders(false)}
              disabled={isRefreshing}
              className={`flex-1 sm:flex-none py-2 px-3 sm:px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="تحديث قائمة الطلبات"
            >
              <RefreshCw className={`w-4 h-4 text-amber-500 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold whitespace-nowrap">تحديث 🔄</span>
            </button>

            {/* Close Shift Button (تقفيل الوردية وتصفير الفواتير) */}
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="py-2 px-3 sm:px-4 rounded-xl border border-amber-500/50 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shrink-0 ring-2 ring-amber-400/30 animate-pulse-slow"
              title={`تقفيل الوردية الحالية (#${currentShiftNumber}) وتصفير الفواتير`}
            >
              <Lock className="w-4 h-4 text-slate-950 shrink-0" />
              <span className="whitespace-nowrap">تقفيل الوردية #{currentShiftNumber} 📋🔒</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`py-2 px-3 sm:px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs shrink-0 ${
                isLight
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
              }`}
              title="تسجيل الخروج من شاشة المتابعة"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold whitespace-nowrap">خروج</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">

        {/* البلوك الموحد الشيك: يجمع كروت الإحصائيات مع البحث والفلترة في بلوك واحد متكامل ومميز */}
        <section className={`relative rounded-3xl p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 border-2 transition-all overflow-hidden ${
          isLight
            ? 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 border-amber-300 shadow-xl shadow-amber-950/5 ring-1 ring-amber-400/25 text-slate-900'
            : 'bg-gradient-to-br from-slate-900 via-[#0d1527] to-slate-950 border-amber-500/40 shadow-2xl shadow-black/60 ring-1 ring-amber-500/20 text-white'
        }`}>
          {/* خلفيات ضوئية ناعمة للبلوك الموحد */}
          <div className={`absolute top-0 left-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none ${
            isLight ? 'bg-amber-300/15' : 'bg-amber-500/10'
          }`} />
          <div className={`absolute bottom-0 right-1/4 w-96 h-48 rounded-full blur-3xl pointer-events-none ${
            isLight ? 'bg-orange-300/10' : 'bg-cyan-500/10'
          }`} />

          {/* المربعات الإحصائية الثلاثة */}
          <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-4">
          
          {/* 1. إجمالي المبيعات المؤكدة */}
          <div className="relative group rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 transition-all duration-300 overflow-hidden border border-cyan-400/45 bg-gradient-to-br from-[#0c3e4a] via-[#0e2a3f] to-[#0c1d2e] shadow-xl hover:border-cyan-300/60 flex flex-col justify-between">
            {/* Ambient corner glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/25 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* Header: Icon Box + Status Tag */}
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-900/60 border border-cyan-400/40 flex items-center justify-center text-lg sm:text-2xl shadow-md shadow-cyan-950/40 shrink-0 group-hover:scale-110 transition-transform select-none">
                  💰
                </div>
                <span className="text-[9.5px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-cyan-900/70 text-cyan-100 border border-cyan-400/40 shadow-xs flex items-center gap-1 shrink-0">
                  <span className="text-xs">✨</span>
                  <span className="hidden sm:inline">صافي التحصيل</span>
                  <span className="sm:hidden">صافي</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-base font-black text-white block tracking-wide truncate">
                  إجمالي المبيعات
                </h3>
                <p className="text-[9.5px] sm:text-xs text-cyan-200/80 font-semibold truncate">
                  المؤكدة المعتمدة
                </p>
              </div>

              {/* Big Value Number */}
              <div className="flex items-baseline gap-1 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                <span className="text-lg sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {confirmedRevenue.toLocaleString('ar-EG')}
                </span>
                <span className="text-[10px] sm:text-base font-black text-cyan-300">جنيه</span>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between gap-1 text-[9px] sm:text-xs font-bold pt-2 sm:pt-3 border-t border-cyan-400/25 text-cyan-200">
              <span className="truncate flex items-center gap-0.5 sm:gap-1 min-w-0">
                <span className="text-[11px] sm:text-xs shrink-0">🪙</span>
                <span className="hidden sm:inline truncate">المؤكد فقط</span>
                <span className="sm:hidden truncate">المؤكد</span>
              </span>
              <span className="bg-cyan-900/80 text-cyan-100 border border-cyan-400/40 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg font-black text-[9px] sm:text-xs shrink-0">
                {confirmedOrders.length} طلب
              </span>
            </div>
          </div>

          {/* 2. عدد الأوردرات المؤكدة */}
          <div className="relative group rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 transition-all duration-300 overflow-hidden border border-purple-400/45 bg-gradient-to-br from-[#3b175e] via-[#241a45] to-[#151433] shadow-xl hover:border-purple-300/60 flex flex-col justify-between">
            {/* Ambient corner glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-purple-400/25 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* Header: Icon Box + Status Tag */}
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-900/60 border border-purple-400/40 flex items-center justify-center text-lg sm:text-2xl shadow-md shadow-purple-950/40 shrink-0 group-hover:scale-110 transition-transform select-none">
                  📦
                </div>
                <span className="text-[9.5px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-900/70 text-purple-100 border border-purple-400/40 shadow-xs flex items-center gap-1 shrink-0">
                  <span className="text-xs">⚡</span>
                  <span className="hidden sm:inline">تم التأكيد</span>
                  <span className="sm:hidden">مؤكد</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-base font-black text-white block tracking-wide truncate">
                  عدد الأوردرات
                </h3>
                <p className="text-[9.5px] sm:text-xs text-purple-200/80 font-semibold truncate">
                  الأوردرات المؤكدة
                </p>
              </div>

              {/* Big Orders Number + Customers */}
              <div className="flex items-baseline justify-between gap-1 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-lg sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {confirmedOrders.length.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-[10px] sm:text-base font-black text-purple-300">أوردر</span>
                </div>

                {/* العملاء */}
                <div className="bg-purple-900/70 border border-purple-400/40 rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-0.5 sm:py-1 text-left shrink-0">
                  <div className="text-[8px] sm:text-[10px] font-bold text-purple-200 flex items-center gap-1 justify-end">
                    <span>👥</span>
                    <span className="hidden sm:inline">العملاء:</span>
                  </div>
                  <div className="text-[10.5px] sm:text-sm font-black text-amber-300 text-right">
                    {uniqueConfirmedCustomers.toLocaleString('ar-EG')} <span className="text-[8px] sm:text-xs font-semibold text-purple-200/70">عميل</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between gap-1 text-[9px] sm:text-xs font-bold pt-2 sm:pt-3 border-t border-purple-400/25 text-purple-200">
              <span className="truncate flex items-center gap-0.5 sm:gap-1 min-w-0">
                <span className="text-[11px] sm:text-xs shrink-0">🛵</span>
                <span className="hidden sm:inline truncate">نشاط العملاء</span>
                <span className="sm:hidden truncate">العملاء</span>
              </span>
              <span className="bg-purple-900/80 text-purple-100 border border-purple-400/40 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg font-black text-[9px] sm:text-xs shrink-0">
                <span className="hidden sm:inline">من </span>{uniqueConfirmedCustomers} شخص
              </span>
            </div>
          </div>

          {/* 3. الطلبات الملغية ومبالغها */}
          <div className="relative group rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 transition-all duration-300 overflow-hidden border border-rose-400/45 bg-gradient-to-br from-[#59172e] via-[#3a1829] to-[#24121e] shadow-xl hover:border-rose-300/60 flex flex-col justify-between">
            {/* Ambient corner glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-rose-400/25 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-red-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* Header: Icon Box + Status Tag */}
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-900/60 border border-rose-400/40 flex items-center justify-center text-lg sm:text-2xl shadow-md shadow-rose-950/40 shrink-0 group-hover:scale-110 transition-transform select-none">
                  🚫
                </div>
                <span className="text-[9.5px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-rose-900/70 text-rose-100 border border-rose-400/40 shadow-xs flex items-center gap-1 shrink-0">
                  <span className="text-xs">❌</span>
                  <span>ملغي</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-base font-black text-white block tracking-wide truncate">
                  الطلبات الملغية
                </h3>
                <p className="text-[9.5px] sm:text-xs text-rose-200/80 font-semibold truncate">
                  فاقد المبيعات
                </p>
              </div>

              {/* Big Cancelled Revenue + Count */}
              <div className="flex items-baseline justify-between gap-1 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-lg sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {cancelledRevenue.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-[10px] sm:text-base font-black text-rose-300">جنيه</span>
                </div>

                {/* عدد الملغي */}
                <div className="bg-rose-900/70 border border-rose-400/40 rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-0.5 sm:py-1 text-left shrink-0">
                  <div className="text-[8px] sm:text-[10px] font-bold text-rose-200 flex items-center gap-1 justify-end">
                    <span>⚠️</span>
                    <span className="hidden sm:inline">العدد:</span>
                  </div>
                  <div className="text-[10.5px] sm:text-sm font-black text-rose-200 text-right">
                    {cancelledOrders.length.toLocaleString('ar-EG')} <span className="text-[8px] sm:text-xs font-semibold text-rose-200/70">أوردر</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between gap-1 text-[9px] sm:text-xs font-bold pt-2 sm:pt-3 border-t border-rose-400/25 text-rose-200">
              <span className="truncate flex items-center gap-0.5 sm:gap-1 min-w-0">
                <span className="text-[11px] sm:text-xs shrink-0">🛑</span>
                <span className="hidden sm:inline truncate">قيمة غير محصلة</span>
                <span className="sm:hidden truncate">الملغي</span>
              </span>
              <span className="bg-rose-900/80 text-rose-100 border border-rose-400/40 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg font-black text-[9px] sm:text-xs shrink-0">
                {cancelledOrders.length} ملغي
              </span>
            </div>
          </div>

          {/* نهاية كروت الإحصائيات الثلاثة */}
          </div>

          {/* الجزء المدمج: البحث والفلترة السريعة داخل نفس البلوك الموحد */}
          <div className={`relative z-10 pt-3 sm:pt-3.5 border-t space-y-3 sm:space-y-3.5 ${
            isLight ? 'border-amber-200/90' : 'border-slate-750/80'
          }`}>
            
            {/* عنوان شريط البحث وتفاصيله */}
            <div className="flex items-center justify-between gap-2 pb-0.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg flex items-center justify-center bg-amber-500 text-slate-950 shadow-xs">
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <h3 className={`text-xs sm:text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  البحث السريع وتصفية الأوردرات
                </h3>
              </div>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                isLight
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-slate-950/80 text-amber-300 border-amber-500/30'
              }`}>
                النتائج: <strong className={`font-mono font-black ${isLight ? 'text-amber-950' : 'text-white'}`}>{filteredOrders.length}</strong> من {orders.length}
              </span>
            </div>

            {/* Top Search Input by Phone or Customer Name */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ابحث برقم الهاتف أو اسم العميل أو العنوان أو رقم الطلب..."
                className={`w-full py-3 px-4 pr-11 pl-10 rounded-xl sm:rounded-2xl border-2 text-xs sm:text-sm font-bold transition focus:outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-white border-amber-300 text-slate-950 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500/20 hover:border-amber-400 shadow-xs'
                    : 'bg-slate-950/90 border-slate-700/90 text-white placeholder-slate-400 focus:border-amber-400 focus:ring-amber-400/20 hover:border-slate-600 shadow-inner'
                }`}
              />
              <Search className={`absolute top-3.5 right-3.5 w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute top-3 left-3 p-1 rounded-lg transition ${
                    isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Status Filter Tabs with Counts */}
            <div className={`flex flex-wrap items-center gap-2 pt-2 border-t ${
              isLight ? 'border-amber-200/80' : 'border-slate-800/80'
            }`}>
              
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  statusFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : isLight
                    ? 'bg-white hover:bg-amber-50 text-slate-900 border-2 border-amber-200/90 shadow-2xs'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <span>الكل</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                  statusFilter === 'all'
                    ? 'bg-slate-950 text-amber-300'
                    : isLight
                    ? 'bg-amber-100 text-amber-950 border border-amber-200'
                    : 'bg-slate-900 text-slate-400'
                }`}>
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  statusFilter === 'pending'
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                    : isLight
                    ? 'bg-white hover:bg-rose-50 text-rose-950 border-2 border-rose-200/90 shadow-2xs'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>بانتظار التأكيد (جديد)</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                  statusFilter === 'pending'
                    ? 'bg-white text-rose-700'
                    : isLight
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-900 text-slate-400'
                }`}>
                  {counts.pending}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('confirmed')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  statusFilter === 'confirmed'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                    : isLight
                    ? 'bg-white hover:bg-emerald-50 text-emerald-950 border-2 border-emerald-200/90 shadow-2xs'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>المؤكدة / جاري التحضير</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                  statusFilter === 'confirmed'
                    ? 'bg-white text-emerald-700'
                    : isLight
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-900 text-slate-400'
                }`}>
                  {counts.confirmed}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('cancelled_before_dispatch')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  statusFilter === 'cancelled_before_dispatch'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                    : isLight
                    ? 'bg-white hover:bg-amber-50 text-amber-950 border-2 border-amber-200/90 shadow-2xs'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ملغي قبل الخروج</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                  statusFilter === 'cancelled_before_dispatch'
                    ? 'bg-white text-amber-700'
                    : isLight
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-slate-900 text-slate-400'
                }`}>
                  {counts.cancelled_before}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('cancelled_not_received')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  statusFilter === 'cancelled_not_received'
                    ? 'bg-red-700 text-white shadow-md ring-2 ring-red-400/50'
                    : isLight
                    ? 'bg-white hover:bg-red-50 text-red-950 border-2 border-red-200/90 shadow-2xs'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>ملغي لعدم الاستلام</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                  statusFilter === 'cancelled_not_received'
                    ? 'bg-white text-red-800'
                    : isLight
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-slate-900 text-slate-400'
                }`}>
                  {counts.cancelled_not_received}
                </span>
              </button>

            </div>
          </div>
        </section>

        {/* Orders List / Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>جار تحميل الطلبات...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={`rounded-3xl p-10 sm:p-14 text-center space-y-3 border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-inner">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className={`text-base sm:text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {searchQuery ? 'لا توجد نتائج مطابقة' : 'شاشة المتابعة فارغة حالياً'}
            </h3>
            <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {searchQuery
                ? `لا توجد طلبات مطابقة لكلمة "${searchQuery}". جرب البحث برقم هاتف أو اسم آخر.`
                : 'الشاشة متصلة وجاهزة، بانتظار استلام طلبات جديدة من العملاء لتظهر هنا لحظياً.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredOrders.map(order => {
              const isPending = order.status === 'pending' || !order.status;
              const isConfirmed = order.status === 'confirmed' || order.status === 'preparing';
              const isCancelledBefore = order.status === 'cancelled_before_dispatch';
              const isCancelledNotReceived = order.status === 'cancelled_not_received';
              const isCancelled = isCancelledBefore || isCancelledNotReceived;
              const isActionTaken = isConfirmed || isCancelled;
              const isExpanded = expandedOrderId === order.id;
              const isOrderLocked = isActionTaken && !unlockedOrderIds.has(String(order.id));

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                    isLight
                      ? isPending
                        ? 'bg-[#eaedf2] border-2 border-rose-500 shadow-[0_8px_25px_rgba(244,63,94,0.16)] ring-2 ring-rose-400/25 hover:border-rose-600'
                        : isConfirmed
                        ? 'bg-[#eaedf2] border-2 border-emerald-500 shadow-[0_8px_25px_rgba(16,185,129,0.16)] ring-1 ring-emerald-400/25 hover:border-emerald-600'
                        : isCancelledBefore
                        ? 'bg-[#eaedf2] border-2 border-amber-400 shadow-md opacity-95 hover:border-amber-500'
                        : 'bg-[#eaedf2] border-2 border-red-500 shadow-md opacity-90 hover:border-red-600'
                      : isPending
                      ? 'bg-slate-800/95 border-2 border-rose-500/70 shadow-[0_8px_30px_rgba(244,63,94,0.18)] ring-2 ring-rose-500/30 hover:border-rose-400'
                      : isConfirmed
                      ? 'bg-slate-800/90 border-2 border-emerald-500/60 shadow-[0_8px_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20 hover:border-emerald-400'
                      : isCancelledBefore
                      ? 'bg-slate-855/80 border-2 border-amber-500/50 shadow-md opacity-90 hover:border-amber-400'
                      : 'bg-slate-850/80 border-2 border-red-500/50 shadow-md opacity-85 hover:border-red-400'
                  }`}
                >
                  {/* ختم الطلب الملغي: يظهر كختم رسمي مائل ومميز على كارت الطلب */}
                  {isCancelled && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[13deg] pointer-events-none select-none z-20 animate-fadeIn w-max max-w-[90%]">
                      <div className={`px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-2xl sm:rounded-3xl border-4 sm:border-[4.5px] border-dashed text-center shadow-xl backdrop-blur-[0.5px] ${
                        isCancelledNotReceived
                          ? 'border-red-500/90 text-red-500/95 bg-red-500/[0.08] dark:border-red-400/90 dark:text-red-400/95 dark:bg-red-500/[0.12] shadow-red-500/15'
                          : 'border-amber-500/90 text-amber-600/95 bg-amber-500/[0.08] dark:border-amber-400/90 dark:text-amber-400/95 dark:bg-amber-500/[0.12] shadow-amber-500/15'
                      }`}>
                        <div className="flex items-center justify-center gap-2 font-black text-base sm:text-xl lg:text-2xl tracking-wider leading-none">
                          <Ban className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 stroke-[2.5] shrink-0" />
                          <span>{isCancelledNotReceived ? 'مُـلـغـــى (عدم استلام)' : 'مُـلـغـــى (قبل الخروج)'}</span>
                        </div>
                        <div className="text-[10.5px] sm:text-xs font-mono font-black tracking-[0.3em] opacity-85 mt-1 sm:mt-1.5">
                          ★ CANCELLED ★
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Header: ID, Time, Status Badge & Accordion Toggle Button */}
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between gap-2 border-b pb-2.5 ${isLight ? 'border-slate-300/80' : 'border-slate-700/80'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg font-mono border ${
                          isLight ? 'bg-white text-amber-900 border-slate-300 shadow-2xs' : 'bg-slate-800 text-amber-300 border-slate-700/80'
                        }`}>
                          #{String(order.id).slice(-6)}
                        </span>
                        {order.created_at && (
                          <span className={`text-[10.5px] font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={order.created_at}>
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatOrderTime(order.created_at)}</span>
                            <span className={`text-[10px] ${isLight ? 'text-amber-800 font-bold' : 'text-amber-400/80'}`}>({getTimeAgo(order.created_at)})</span>
                          </span>
                        )}
                      </div>

                      {/* Status Indicator Badge & Lock Badge */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {isPending && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                            isLight
                              ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-2xs'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span>جديد</span>
                          </span>
                        )}
                        {isConfirmed && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                            isLight
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                            <span>مؤكد</span>
                          </span>
                        )}
                        {isCancelledBefore && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                            isLight
                              ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            <AlertTriangle className={`w-3 h-3 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                            <span>ملغي</span>
                          </span>
                        )}
                        {isCancelledNotReceived && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                            isLight
                              ? 'bg-red-100 text-red-800 border-red-300 shadow-2xs'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}>
                            <XCircle className={`w-3 h-3 ${isLight ? 'text-red-700' : 'text-red-400'}`} />
                            <span>عدم استلام</span>
                          </span>
                        )}

                        {/* زر القفل في أعلى الكارت للطلبات المؤكدة أو الملغية */}
                        {isActionTaken && (
                          isOrderLocked ? (
                            <button
                              type="button"
                              onClick={() => setUnlockModalOrder(order)}
                              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black border transition cursor-pointer shadow-xs active:scale-95 ${
                                isLight
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/50'
                              }`}
                              title={
                                isConfirmed
                                  ? 'الطلب مؤكد ومقفل لمنع التعديل بالخطأ - اضغط لطلب فك القفل'
                                  : 'الطلب ملغي ومقفل لمنع التعديل بالخطأ - اضغط لطلب فك القفل'
                              }
                            >
                              <Lock className="w-3 h-3 text-amber-500 animate-pulse" />
                              <span>مقفل 🔒</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setUnlockedOrderIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(String(order.id));
                                  return next;
                                });
                                showNotice(`تمت إعادة قفل الأوردر #${String(order.id).slice(-6)} وتأمينه 🔒`, 'success');
                              }}
                              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black border transition cursor-pointer shadow-xs active:scale-95 ${
                                isLight
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/50 ring-1 ring-emerald-400/30'
                              }`}
                              title="الطلب مفتوح للتعديل - اضغط لإعادة قفله"
                            >
                              <Unlock className="w-3 h-3 text-emerald-500" />
                              <span>مفتوح 🔓</span>
                            </button>
                          )
                        )}

                        {/* زر فتح وغلق تفاصيل الكارت الأكورديون */}
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(prev => prev === order.id ? null : order.id)}
                          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border transition flex items-center justify-center cursor-pointer shadow-xs active:scale-95 ${
                            isExpanded
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                              : isLight
                              ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs hover:border-amber-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-amber-400'
                          }`}
                          title={isExpanded ? 'طي تفاصيل الطلب' : 'فتح وتفاصيل الطلب بالكامل'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-950 stroke-[3]" />
                          ) : (
                            <ChevronDown className={`w-5 h-5 stroke-[3] ${isLight ? 'text-slate-900' : 'text-amber-400'}`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Customer Info & Summary Row (ظاهر دائماً سواء الكارت مقفول أو مفتوح) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className={`text-base font-black truncate ${isLight ? 'text-slate-950' : 'text-white'}`}>{order.customer_name}</h4>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black shrink-0 border ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          }`}>
                            {order.items_count || 1} أصناف
                          </span>
                        </div>
                        <div className="text-left shrink-0">
                          <span className={`text-sm sm:text-base font-black font-mono ${
                            isLight ? 'text-amber-800' : 'text-amber-400'
                          }`}>
                            {order.total_amount} ج.م
                          </span>
                        </div>
                      </div>

                      {/* Phone with Fast Call & WhatsApp */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold font-mono px-3 py-2 rounded-xl border flex-1 flex items-center justify-between shadow-2xs ${
                          isLight
                            ? 'bg-white text-slate-950 border-slate-300'
                            : 'bg-slate-950/90 text-slate-200 border-slate-800'
                        }`}>
                          <span>{order.customer_phone}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            isLight ? 'text-slate-700 bg-slate-100 border border-slate-200' : 'text-slate-400 bg-slate-800/60'
                          }`}>
                            {order.payment_method === 'vodafone_cash' ? 'محفظة' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش'}
                          </span>
                        </span>
                        <a
                          href={`tel:${order.customer_phone}`}
                          className={`px-3.5 py-2 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-2xs ${
                            isLight
                              ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300'
                              : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 border-blue-500/40'
                          }`}
                          title="اتصال بالعميل"
                        >
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                        </a>
                        <a
                          href={`https://wa.me/2${String(order.customer_phone).replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3.5 py-2 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-2xs ${
                            isLight
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border-emerald-500/40'
                          }`}
                          title="محادثة واتساب"
                        >
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </a>
                      </div>

                      {/* زر سريع لفتح التفاصيل إذا كان الكارت مقفول */}
                      {!isExpanded && (
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(order.id)}
                          className={`w-full py-2.5 sm:py-3 px-4 rounded-2xl border text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 shadow-xs ${
                            isLight
                              ? 'bg-white hover:bg-amber-50/80 border-slate-300 hover:border-amber-400 text-slate-900 hover:text-amber-900'
                              : 'bg-slate-950/60 hover:bg-slate-950 border-slate-700 hover:border-amber-500/50 text-amber-300'
                          }`}
                        >
                          <Utensils className={`w-4 h-4 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                          <span>عرض تفاصيل ومكونات الوجبات ({order.items_count || 1}) ▾</span>
                        </button>
                      )}

                      {/* الجزء الموسع بالكامل: يحافظ على تصميمه الأصلي بنسبة 100% */}
                      {isExpanded && (
                        <div className="space-y-2 pt-1 animate-fadeIn">
                          {/* Order Type & Zone with Delivery Fee at the end */}
                          <div className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs border ${
                            isLight
                              ? 'text-rose-950 bg-white border-rose-300'
                              : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                              <span className="truncate">
                                {order.order_type === 'pickup' || order.delivery_zone === 'استلام من المطعم (تيك أواي)'
                                  ? '🏬 استلام تيك أواي من المطعم'
                                  : `🛵 توصيل: ${order.delivery_zone || 'سنهور القبلية'}`}
                              </span>
                            </div>

                            {/* مبلغ التوصيل في نهاية الصف */}
                            {order.order_type !== 'pickup' && order.delivery_zone !== 'استلام من المطعم (تيك أواي)' && (
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`text-[10px] font-normal ${isLight ? 'text-rose-700' : 'text-rose-300/80'}`}>خدمة التوصيل:</span>
                                <span className={`px-2 py-0.5 rounded-lg border font-mono font-black text-xs ${
                                  isLight
                                    ? 'bg-rose-100 border-rose-300 text-rose-900'
                                    : 'bg-rose-500/20 border-rose-500/30 text-rose-200'
                                }`}>
                                  {typeof order.delivery_fee === 'number'
                                    ? `${order.delivery_fee} ج.م`
                                    : order.delivery_fee
                                    ? `${order.delivery_fee} ج.م`
                                    : '10 ج.م'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Address & Building notes */}
                          {order.delivery_address && (
                            <div className={`text-[11px] p-2 rounded-xl border space-y-0.5 shadow-2xs ${
                              isLight
                                ? 'text-slate-900 bg-white border-slate-300'
                                : 'text-slate-300 bg-slate-950/60 border-slate-800/80'
                            }`}>
                              <p className="font-medium">{order.delivery_address}</p>
                              {order.building_notes && (
                                <p className={`text-[10.5px] font-bold ${isLight ? 'text-amber-800 font-black' : 'text-amber-400/90'}`}>
                                  العمارة/الدور: {order.building_notes}
                                </p>
                              )}
                            </div>
                          )}

                          {/* مربع تفاصيل الطلب والأصناف وملاحظات الأوردر المتطور والمنظم */}
                          {(() => {
                            const parsed = parseOrderDetails(order.special_notes);
                            return (
                              <div className={`rounded-2xl border p-3 space-y-2.5 shadow-2xs ${
                                isLight
                                  ? 'bg-white border-slate-300'
                                  : 'bg-slate-950/80 border-slate-800/90 shadow-inner'
                              }`}>
                                
                                {/* عنوان ورأس الأصناف */}
                                <div className={`flex items-center justify-between border-b pb-1.5 ${
                                  isLight ? 'border-slate-200' : 'border-slate-800'
                                }`}>
                                  <span className={`text-xs font-black flex items-center gap-1.5 ${
                                    isLight ? 'text-amber-800' : 'text-amber-400'
                                  }`}>
                                    <Utensils className="w-3.5 h-3.5" />
                                    <span>الأصناف والوجبات المطلوبة ({order.items_count} صنف):</span>
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold ${
                                    isLight ? 'text-slate-500' : 'text-slate-400'
                                  }`}>
                                    #{String(order.id).slice(-4)}
                                  </span>
                                </div>

                                {/* قائمة الأصناف - كل طلب في سطر مستقل مع رقم الصنف والتفاصيل والسعر في نهاية السطر */}
                                {parsed.items.length > 0 ? (
                                  <div className="space-y-2.5 pt-0.5">
                                    {parsed.items.map((itemStr, idx) => {
                                      const itemInfo = parseItemLine(itemStr);
                                      const hasAlertNotes = Boolean(itemInfo.without || itemInfo.notes);

                                      return (
                                        <div key={idx} className="flex items-start gap-2 sm:gap-2.5">
                                          {/* رقم الصنف خارج المربع على اليمين */}
                                          <span className={`w-6 h-6 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 mt-1 shadow-2xs font-mono ${
                                            isLight
                                              ? hasAlertNotes
                                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                                : 'bg-amber-100 text-amber-900 border-amber-300'
                                              : hasAlertNotes
                                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                              : 'bg-slate-800 text-amber-300 border-slate-700'
                                          }`}>
                                            {idx + 1}
                                          </span>

                                          {/* مربع تفاصيل ومكونات الصنف */}
                                          <div
                                            className={`flex-1 min-w-0 rounded-2xl border transition-all p-2.5 space-y-2 ${
                                              isLight
                                                ? hasAlertNotes
                                                  ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                                                  : 'bg-white border-slate-200 shadow-xs'
                                                : hasAlertNotes
                                                ? 'bg-slate-900/98 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]'
                                                : 'bg-slate-900/95 border-slate-800/90 hover:bg-slate-900'
                                            }`}
                                          >
                                            {/* السطر الرئيسي للصنف: الاسم، الحجم، الكمية، والشارة التنبيهية والسعر */}
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                                                <span className={`font-black text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                                  {itemInfo.name}
                                                </span>

                                              {itemInfo.size && (
                                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                                  isLight
                                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                                }`}>
                                                  {itemInfo.size}
                                                </span>
                                              )}

                                              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-black font-mono ${
                                                isLight
                                                  ? 'bg-amber-100 text-amber-900'
                                                  : 'bg-amber-500/10 text-amber-300'
                                              }`}>
                                                × {itemInfo.quantity}
                                              </span>
                                            </div>

                                            {/* سعر الصنف في نهاية السطر */}
                                            {itemInfo.price && (
                                              <span className={`px-2.5 py-1 rounded-lg border font-mono font-black text-xs whitespace-nowrap shrink-0 shadow-xs ${
                                                isLight
                                                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                              }`}>
                                                {itemInfo.price}
                                              </span>
                                            )}
                                          </div>

                                          {/* تنبيهات المستبعدات (بدون) والملاحظات للأصناف العادية بشكل بارز ومستقل */}
                                          {!itemInfo.isCustom && (itemInfo.without || itemInfo.notes || itemInfo.extras) && (
                                            <div className={`pt-2 border-t space-y-1.5 text-xs ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                                              {/* 1. بدون (مستبعدات الصنف العادي) بلون تحذيري أحمر/روز */}
                                              {itemInfo.without && (
                                                <button
                                                  type="button"
                                                  onClick={() => setSelectedItemNote({
                                                    title: `${itemInfo.name} (الكمية: ${itemInfo.quantity})`,
                                                    without: itemInfo.without,
                                                    notes: itemInfo.notes
                                                  })}
                                                  title="اضغط لتكبير تعليمات المطبخ"
                                                  className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border shadow-xs cursor-pointer transition text-right ${
                                                    isLight
                                                      ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-800'
                                                      : 'bg-rose-950/50 hover:bg-rose-950/70 border-rose-500/50 text-rose-200 animate-pulse'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className={`font-black min-w-[75px] shrink-0 flex items-center gap-1 ${
                                                      isLight ? 'text-red-700' : 'text-rose-400'
                                                    }`}>
                                                      <AlertTriangle className={`w-3.5 h-3.5 ${isLight ? 'text-red-600' : 'text-rose-400'}`} />
                                                      <span>🚫 بدون:</span>
                                                    </span>
                                                    <span className={`font-black tracking-wide ${isLight ? 'text-red-950' : 'text-rose-100'}`}>{itemInfo.without}</span>
                                                  </div>
                                                  <span className={`text-[10px] font-bold underline shrink-0 ${isLight ? 'text-red-700' : 'text-rose-400'}`}>تكبير</span>
                                                </button>
                                              )}

                                              {/* 2. ملاحظات الصنف العادي بلون أصفر/ذهبي */}
                                              {itemInfo.notes && (
                                                <button
                                                  type="button"
                                                  onClick={() => setSelectedItemNote({
                                                    title: `${itemInfo.name} (الكمية: ${itemInfo.quantity})`,
                                                    without: itemInfo.without,
                                                    notes: itemInfo.notes
                                                  })}
                                                  title="اضغط لتكبير ملاحظات الصنف"
                                                  className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border cursor-pointer transition text-right ${
                                                    isLight
                                                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                                                      : 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/30 text-amber-200'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className={`font-black min-w-[75px] shrink-0 flex items-center gap-1 ${
                                                      isLight ? 'text-amber-800' : 'text-amber-400'
                                                    }`}>
                                                      <span>📝 ملاحظات:</span>
                                                    </span>
                                                    <span className={`font-bold leading-relaxed ${isLight ? 'text-slate-900' : 'text-white'}`}>{itemInfo.notes}</span>
                                                  </div>
                                                  <span className={`text-[10px] font-bold underline shrink-0 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>تكبير</span>
                                                </button>
                                              )}

                                              {/* 3. الإضافات الملكية للصنف العادي */}
                                              {itemInfo.extras && (
                                                <div className={`flex items-center gap-2 p-2 rounded-xl border text-xs ${
                                                  isLight
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                                    : 'bg-slate-950/70 border-slate-800 text-emerald-200'
                                                }`}>
                                                  <span className={`font-black min-w-[75px] shrink-0 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>✨ الإضافات:</span>
                                                  <span className={`font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-200'}`}>{itemInfo.extras}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* تفاصيل الطاجن المخصوص مرتبة سطر بسطر بالترتيب المطلوب بدقة:
                                              1. الأساس  2. بدون (مستبعدات الأساس)  3. البروتين  4. الشطة  5. الإضافات  6. ملاحظات */}
                                          {itemInfo.isCustom && (
                                            <div className={`pt-2 border-t space-y-1.5 text-xs ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                                              
                                              {/* 1. الأساس */}
                                              {itemInfo.base && (
                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
                                                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
                                                }`}>
                                                  <span className={`font-black min-w-[75px] shrink-0 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>🍲 الأساس:</span>
                                                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{itemInfo.base}</span>
                                                </div>
                                              )}

                                              {/* 2. بدون (مستبعدات الأساس) بلون تحذيري أحمر/روز بارز ومباشرة بعد الأساس مع إمكانية الضغط */}
                                              {itemInfo.without && (
                                                <button
                                                  type="button"
                                                  onClick={() => setSelectedItemNote({
                                                    title: `طاجن مبتكر خاص (الكمية: ${itemInfo.quantity})`,
                                                    without: itemInfo.without,
                                                    notes: itemInfo.notes
                                                  })}
                                                  title="اضغط لتكبير تعليمات المطبخ"
                                                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border shadow-xs cursor-pointer transition text-right ${
                                                    isLight
                                                      ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-800'
                                                      : 'bg-rose-950/50 hover:bg-rose-950/70 border-rose-500/50 text-rose-200'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className={`font-black min-w-[75px] shrink-0 flex items-center gap-1 ${
                                                      isLight ? 'text-red-700' : 'text-rose-400'
                                                    }`}>
                                                      <AlertTriangle className={`w-3.5 h-3.5 ${isLight ? 'text-red-600' : 'text-rose-400'}`} />
                                                      <span>🚫 بدون:</span>
                                                    </span>
                                                    <span className={`font-black tracking-wide ${isLight ? 'text-red-950' : 'text-rose-100'}`}>{itemInfo.without}</span>
                                                  </div>
                                                  <span className={`text-[10px] font-bold underline shrink-0 ${isLight ? 'text-red-700' : 'text-rose-400'}`}>تكبير</span>
                                                </button>
                                              )}

                                              {/* 3. البروتين (تحت الأساس والمستبعدات مباشرة) */}
                                              {itemInfo.protein && (
                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
                                                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
                                                }`}>
                                                  <span className={`font-black min-w-[75px] shrink-0 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>🥩 البروتين:</span>
                                                  <span className={`font-bold leading-relaxed ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{itemInfo.protein}</span>
                                                </div>
                                              )}

                                              {/* 4. الشطة */}
                                              {itemInfo.spice && (
                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
                                                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
                                                }`}>
                                                  <span className={`font-black min-w-[75px] shrink-0 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>🌶️ الشطة:</span>
                                                  <span className={`font-bold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>{itemInfo.spice}</span>
                                                </div>
                                              )}

                                              {/* 5. الإضافات الملكية والمقرمشات - تحت بعض داخل نفس الحاوية */}
                                              {itemInfo.extrasList && itemInfo.extrasList.length > 0 && (
                                                <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                                                  isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-950/70 border-slate-800/80'
                                                }`}>
                                                  <div className={`flex items-center gap-1.5 font-black ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span>الإضافات والمقرمشات ({itemInfo.extrasList.length}):</span>
                                                  </div>
                                                  <div className={`space-y-1 pr-2 mr-1 border-r-2 ${isLight ? 'border-emerald-300' : 'border-emerald-500/30'}`}>
                                                    {itemInfo.extrasList.map((extraItem, eIdx) => (
                                                      <div key={eIdx} className={`flex items-center gap-2 text-xs font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-200'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'}`}></span>
                                                        <span>{extraItem}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {/* 6. ملاحظات الشيف الخاصة بالطاجن */}
                                              {itemInfo.notes && (
                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
                                                  isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                                                }`}>
                                                  <span className={`font-black min-w-[75px] shrink-0 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>💬 ملاحظات:</span>
                                                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{itemInfo.notes}</span>
                                                </div>
                                              )}

                                            </div>
                                          )}

                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className={`flex items-center justify-between text-xs py-2 font-medium px-3 rounded-xl border ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-slate-900/80 text-slate-300 border-slate-800'
                                  }`}>
                                    <span>عدد الأصناف: {order.items_count} صنف</span>
                                    <span className={`px-2.5 py-1 rounded-lg border font-mono font-black text-xs ${
                                      isLight
                                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    }`}>
                                      {order.subtotal || order.total_amount} ج.م
                                    </span>
                                  </div>
                                )}

                                {/* السطر التالي: ملاحظات الطلب والزبون بشكل بارز ومنظم */}
                                {parsed.notes ? (
                                  <div className={`pt-1.5 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                                    <div className={`p-2.5 rounded-xl border text-xs font-bold space-y-1 ${
                                      isLight
                                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                    }`}>
                                      <span className={`text-[11px] font-black block ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                                        📌 ملاحظات الأوردر والزبون:
                                      </span>
                                      <p className={`text-xs font-bold leading-relaxed pr-1 whitespace-pre-wrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                        {parsed.notes}
                                      </p>
                                    </div>
                                  </div>
                                ) : null}

                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* THE 2 ACTION BUTTONS */}
                  <div className={`pt-2 border-t space-y-2 ${isLight ? 'border-slate-300/80' : 'border-slate-700/80'}`}>
                    {isOrderLocked ? (
                      <div
                        onClick={() => setUnlockModalOrder(order)}
                        className={`py-2.5 px-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition shadow-xs group/lock select-none ${
                          isLight
                            ? 'bg-amber-50/90 hover:bg-amber-100/90 border-amber-300 text-amber-950 shadow-amber-950/5'
                            : 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40 text-amber-200'
                        }`}
                        title="الطلب مقفل لمنع التعديل بالخطأ - اضغط لطلب فك القفل"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Lock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                          <div className="min-w-0">
                            <span className="text-xs font-black block truncate">
                              {isConfirmed ? 'الطلب مؤكد ومقفل بالحماية 🔒' : 'الطلب ملغي ومقفل بالحماية 🔒'}
                            </span>
                            <span className="text-[10px] font-bold text-amber-400/90 block truncate">لا يمكن الضغط إلا بعد فك القفل</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500 group-hover/lock:bg-amber-600 text-slate-950 text-xs font-black shrink-0 shadow-xs flex items-center gap-1 transition">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>فك القفل</span>
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        
                        {/* 1. Confirm Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'confirmed', 'مؤكد')}
                          disabled={isConfirmed}
                          className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs ${
                            isConfirmed
                              ? 'bg-emerald-600 text-white shadow-md opacity-100 ring-2 ring-emerald-400/50'
                              : isLight
                              ? 'bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-400 shadow-2xs hover:border-emerald-500'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                          }`}
                          title="تأكيد الأوردر وبدء التجهيز"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-black">
                            {isConfirmed ? 'تم التأكيد ✓' : 'تأكيد'}
                          </span>
                        </button>

                        {/* 2. Cancel Not Received Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'cancelled_not_received', 'عدم استلام')}
                          disabled={isCancelledNotReceived}
                          className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs ${
                            isCancelledNotReceived
                              ? 'bg-red-700 text-white shadow-md opacity-100 ring-2 ring-red-400/50'
                              : isLight
                              ? 'bg-white hover:bg-red-50 text-red-800 border-2 border-red-400 shadow-2xs hover:border-red-500'
                              : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                          }`}
                          title="إلغاء الطلب بسبب عدم استلام العميل"
                        >
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-black">
                            {isCancelledNotReceived ? 'عدم استلام' : 'إلغاء "عدم استلام"'}
                          </span>
                        </button>

                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* نافذة تفاعلية منبثقة عند الضغط على زر بدون أو الملاحظات للصنف */}
      {selectedItemNote && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn ${
          isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'
        }`}>
          <div className={`relative w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scaleUp border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h4 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>تعليمات الصنف للمطبخ</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedItemNote(null)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-2.5 rounded-xl border text-xs font-black ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950/80 border-slate-800 text-amber-400'
            }`}>
              {selectedItemNote.title}
            </div>

            {selectedItemNote.without && (
              <div className={`p-3.5 border rounded-2xl space-y-1 ${
                isLight ? 'bg-red-50 border-red-300' : 'bg-rose-950/40 border-rose-500/40'
              }`}>
                <span className={`text-xs font-black block flex items-center gap-1.5 ${
                  isLight ? 'text-red-700' : 'text-rose-400'
                }`}>
                  <AlertTriangle className={`w-3.5 h-3.5 ${isLight ? 'text-red-600' : 'text-rose-400'}`} />
                  <span>مستبعدات الصنف (بدون):</span>
                </span>
                <p className={`text-sm font-black pr-1 leading-relaxed ${
                  isLight ? 'text-red-950' : 'text-rose-100'
                }`}>
                  {selectedItemNote.without}
                </p>
              </div>
            )}

            {selectedItemNote.notes && (
              <div className={`p-3.5 border rounded-2xl space-y-1 ${
                isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-950/40 border-amber-500/40'
              }`}>
                <span className={`text-xs font-black block flex items-center gap-1.5 ${
                  isLight ? 'text-amber-800' : 'text-amber-400'
                }`}>
                  <span>📝 ملاحظات خاصة للصنف:</span>
                </span>
                <p className={`text-sm font-bold pr-1 leading-relaxed ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {selectedItemNote.notes}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedItemNote(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md active:scale-95"
            >
              تم، فهمت المطلوب للشيف ✓
            </button>
          </div>
        </div>
      )}

      {/* نافذة تأكيد فك قفل الطلب لمنع التعديل بالخطأ */}
      {unlockModalOrder && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn ${
          isLight ? 'bg-slate-900/50' : 'bg-slate-950/85'
        }`}>
          <div className={`relative w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex items-start justify-between border-b pb-4 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-black leading-tight">تأكيد فك قفل الطلب</h4>
                  <p className={`text-xs font-bold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    أوردر رقم <span className="font-mono text-amber-500 font-black">#{String(unlockModalOrder.id).slice(-6)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlockModalOrder(null)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Brief Info */}
            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs font-bold ${
              isLight ? 'bg-slate-50 border-slate-200/80 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>حالة الطلب الحالية:</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                  unlockModalOrder.status === 'confirmed' || unlockModalOrder.status === 'preparing'
                    ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : unlockModalOrder.status === 'cancelled_not_received'
                    ? isLight ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-500/20 text-red-300 border-red-500/40'
                    : isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {unlockModalOrder.status === 'confirmed' || unlockModalOrder.status === 'preparing'
                    ? 'مؤكد ✓'
                    : unlockModalOrder.status === 'cancelled_not_received'
                    ? 'ملغي (عدم استلام) 🔴'
                    : 'ملغي ⚠️'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>اسم العميل:</span>
                <span className="font-black text-sm">{unlockModalOrder.customer_name || 'عميل محلي'}</span>
              </div>
              {unlockModalOrder.customer_phone && (
                <div className="flex items-center justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>رقم الهاتف:</span>
                  <span className="font-mono font-black dir-ltr text-left">{unlockModalOrder.customer_phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-300 dark:border-slate-800">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>إجمالي الأوردر:</span>
                <span className="font-black text-amber-500 text-sm font-mono">
                  {Number(unlockModalOrder.total_amount || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            {/* Warning Box */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isLight ? 'bg-amber-50 border-amber-200/90 text-amber-950' : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}>
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-black">
                  {unlockModalOrder.status === 'confirmed' || unlockModalOrder.status === 'preparing'
                    ? 'تم تأمين هذا الطلب المؤكد بقفل حماية تلقائي لمنع التعديل أو الإلغاء بالخطأ.'
                    : 'تم قفل هذا الطلب الملغي بقفل حماية تلقائي لمنع تغيير حالته بالخطأ.'}
                </p>
                <p className={`font-medium ${isLight ? 'text-amber-800' : 'text-amber-300/80'}`}>
                  هل تريد بالتأكيد فك القفل للسماح بتعديل حالة هذا الطلب؟
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUnlockedOrderIds(prev => {
                    const next = new Set(prev);
                    next.add(String(unlockModalOrder.id));
                    return next;
                  });
                  setUnlockModalOrder(null);
                  setActionNotice({
                    msg: `تم فك قفل الطلب #${String(unlockModalOrder.id).slice(-6)} بنجاح، يمكنك الآن تعديل حالته 🔓`,
                    type: 'warn'
                  });
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>نعم، فك قفل الأوردر</span>
              </button>
              <button
                type="button"
                onClick={() => setUnlockModalOrder(null)}
                className={`py-3 px-4 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                إلغاء وإبقاء القفل
              </button>
            </div>

          </div>
        </div>
      )}

      {/* مودال تقفيل الوردية الحالية وتصفير الفواتير */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 border-2 shadow-2xl space-y-5 ${
            isLight
              ? 'bg-white border-amber-300 text-slate-900 shadow-amber-950/20'
              : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-amber-500/40 text-white shadow-black/80'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                    <span>تقفيل الوردية رقم #{currentShiftNumber}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      تصفير الفواتير 🔒
                    </span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    مراجعة إحصائيات الوردية قبل الإغلاق ونقل الفواتير إلى الأرشيف
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                disabled={isClosingShift}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shift Timing Info */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
              isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>بدء الوردية: {currentShiftStartTime ? formatOrderTime(currentShiftStartTime) : 'بداية اليوم'}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span>وقت الإغلاق: الآن ({formatOrderTime(new Date().toISOString())})</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'}`}>
                <div className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>إجمالي فواتير الوردية</div>
                <div className="text-xl font-black font-mono mt-1 text-amber-500">{shiftSummary.totalOrders} فاتورة</div>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className={`text-[11px] font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>الفواتير المؤكدة</div>
                <div className="text-xl font-black font-mono mt-1 text-emerald-500">{shiftSummary.confirmedOrders} مؤكد</div>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'} col-span-2 sm:col-span-1`}>
                <div className={`text-[11px] font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>صافي مبيعات الوردية</div>
                <div className="text-xl font-black font-mono mt-1 text-emerald-500">{shiftSummary.totalRevenue.toLocaleString()} ج.م</div>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-red-50/70 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className={`text-[11px] font-bold ${isLight ? 'text-red-800' : 'text-red-400'}`}>فواتير ملغية</div>
                <div className="text-lg font-black font-mono mt-1 text-red-500">{shiftSummary.cancelledOrders} طلب</div>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-sky-500/10 border-sky-500/20'}`}>
                <div className={`text-[11px] font-bold ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>طلبات الدليفري</div>
                <div className="text-lg font-black font-mono mt-1 text-sky-500">{shiftSummary.deliveryCount} دليفري</div>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? 'bg-purple-50/70 border-purple-200' : 'bg-purple-500/10 border-purple-500/20'}`}>
                <div className={`text-[11px] font-bold ${isLight ? 'text-purple-800' : 'text-purple-400'}`}>طلبات الاستلام</div>
                <div className="text-lg font-black font-mono mt-1 text-purple-500">{shiftSummary.pickupCount} صالة/تيك أواي</div>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className={`p-3.5 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'}`}>
              <div className="text-xs font-black text-amber-500 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>تفصيل طرق الدفع للمبيعات المؤكدة:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  <span className="text-[11px] text-slate-400 block font-bold">كاش (نقدي)</span>
                  <span className="font-mono font-black text-emerald-500">{shiftSummary.cashAmount.toLocaleString()} ج.م</span>
                </div>
                <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  <span className="text-[11px] text-slate-400 block font-bold">فودافون كاش / محافظ</span>
                  <span className="font-mono font-black text-amber-500">{shiftSummary.walletAmount.toLocaleString()} ج.م</span>
                </div>
                <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  <span className="text-[11px] text-slate-400 block font-bold">إنستاباي</span>
                  <span className="font-mono font-black text-cyan-500">{shiftSummary.instapayAmount.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>

            {/* Pending Orders Warning if any */}
            {shiftSummary.pendingOrders > 0 && (
              <div className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs font-bold ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  تنبيه: يوجد {shiftSummary.pendingOrders} طلبات قيد الانتظار لم يتم تأكيدها أو إلغاؤها بعد. سيتم إغلاق الوردية وأرشفتها مع هذه الفواتير.
                </span>
              </div>
            )}

            {/* Shift Zeroing Notice */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed ${
              isLight ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
            }`}>
              <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-black mb-1">ماذا يحدث عند الضغط على تأكيد التقفيل؟</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                  <li>سيتم تصفير فواتير شاشة المتابعة فوراً لتجهيز الشاشة للوردية الجديدة رقم #{currentShiftNumber + 1}.</li>
                  <li>ستنتقل كافة فواتير وإحصائيات هذه الوردية بالكامل إلى تبويبة <strong>(فواتير الورديات)</strong> في لوحة الإدارة.</li>
                  <li>لن يتم حذف أي فاتورة من النظام وستظل محفوظة بالكامل في الأرشيف والتقارير.</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmCloseShift}
                disabled={isClosingShift}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm transition cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isClosingShift ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>جاري تقفيل الوردية وتصفير الشاشة...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-950" />
                    <span>تأكيد تقفيل الوردية وتصفير الفواتير 🔒</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                disabled={isClosingShift}
                className={`py-3.5 px-5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
