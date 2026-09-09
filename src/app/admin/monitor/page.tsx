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
  Utensils
} from 'lucide-react';
import { fetchOrdersFromDatabase, updateOrderStatusInDb, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useMenuStore } from '@/lib/menuStore';
import { sounds } from '@/lib/sound';

export default function OrderMonitorPage() {
  const { monitorPassword = 'sanhour123', syncWithServer } = useMenuStore();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled_before_dispatch' | 'cancelled_not_received'>('all');
  const [actionNotice, setActionNotice] = useState<{ msg: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [selectedItemNote, setSelectedItemNote] = useState<{ title: string; without?: string; notes?: string } | null>(null);

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
    }

    // Live clock timer
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, [syncWithServer]);

  // Load orders when authenticated
  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const data = await fetchOrdersFromDatabase();
      if (data && Array.isArray(data)) {
        // Check for newly arrived pending orders to trigger audio chime
        if (soundEnabled && prevOrdersCountRef.current > 0 && data.length > prevOrdersCountRef.current) {
          sounds.playAddChime();
        }
        prevOrdersCountRef.current = data.length;
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

  // The 3 Action Buttons Handler
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: 'confirmed' | 'cancelled_before_dispatch' | 'cancelled_not_received',
    statusLabel: string
  ) => {
    try {
      await updateOrderStatusInDb(orderId, newStatus);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
      sounds.playSuccessChime();

      if (newStatus === 'confirmed') {
        showNotice(`تم تأكيد الأوردر #${String(orderId).slice(-6)} بنجاح 🟢`, 'success');
      } else if (newStatus === 'cancelled_before_dispatch') {
        showNotice(`تم تسجيل إلغاء الأوردر #${String(orderId).slice(-6)} قبل خروجه ⚠️`, 'warn');
      } else {
        showNotice(`تم تسجيل إلغاء الأوردر #${String(orderId).slice(-6)} لعدم الاستلام 🔴`, 'error');
      }
    } catch (err: any) {
      alert('تعذر تحديث حالة الطلب، يرجى المحاولة مرة أخرى');
    }
  };

  // Filter orders by phone, name, and status
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
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
  }, [orders, searchQuery, statusFilter]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending' || !o.status).length,
      confirmed: orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
      cancelled_before: orders.filter(o => o.status === 'cancelled_before_dispatch').length,
      cancelled_not_received: orders.filter(o => o.status === 'cancelled_not_received').length,
    };
  }, [orders]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 pb-24">
      
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
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-2.5 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          
          {/* Top Row / Right Brand Info */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#dc0b07] border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-md shrink-0">
                <Image src="/logo-transparent.png" alt="لؤلؤة سنهور" fill className="object-contain p-1" priority />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white whitespace-nowrap">شاشة متابعة الطلبات 🖥️</h2>
                  <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>مباشر</span>
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
                  متابعة وتأكيد طلبات الزبائن وإلغائها لحظياً • مطعم لؤلؤة سنهور
                </p>
              </div>
            </div>

            {/* Mobile-only Live Clock next to brand */}
            <div className="flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80 text-amber-300 font-mono text-[11px] font-bold shadow-xs">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{currentTime.toLocaleTimeString('ar-EG', { hour12: true })}</span>
            </div>
          </div>

          {/* Action Buttons & Desktop Clock: 100% visible on all screens */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto">
            
            {/* Desktop Live Clock Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 text-amber-300 font-mono text-xs font-bold shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{currentTime.toLocaleTimeString('ar-EG', { hour12: true })}</span>
            </div>

            {/* Sound Alerts Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex-1 sm:flex-none py-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title={soundEnabled ? 'تنبيه الصوت مفعل للطلبات الجديدة' : 'تنبيه الصوت مكتوم'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
              <span className="text-[11px] sm:text-xs">{soundEnabled ? 'التنبيه: يعمل 🔊' : 'مكتوم 🔇'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadOrders(false)}
              disabled={isRefreshing}
              className="flex-1 sm:flex-none py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              title="تحديث قائمة الطلبات"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[11px] sm:text-xs">تحديث 🔄</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              title="تسجيل الخروج من شاشة المتابعة"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[11px] sm:text-xs">خروج</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        
        {/* Search & Filter Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl space-y-3">
          
          {/* Top Search Input by Phone or Customer Name */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ابحث برقم الهاتف أو اسم العميل أو العنوان أو رقم الطلب..."
              className="w-full py-3 px-4 pr-11 pl-10 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-xs sm:text-sm font-bold transition"
            />
            <Search className="absolute top-3.5 right-3.5 w-4 h-4 text-amber-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-3 left-3 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Status Filter Tabs with Counts */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
            
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <span>الكل</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'all' ? 'bg-slate-950 text-amber-300' : 'bg-slate-900 text-slate-400'}`}>
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <span>بانتظار التأكيد (جديد)</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'pending' ? 'bg-white text-rose-700' : 'bg-slate-900 text-slate-400'}`}>
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>المؤكدة / جاري التحضير</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'confirmed' ? 'bg-white text-emerald-700' : 'bg-slate-900 text-slate-400'}`}>
                {counts.confirmed}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('cancelled_before_dispatch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'cancelled_before_dispatch'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ملغي قبل الخروج</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'cancelled_before_dispatch' ? 'bg-white text-amber-700' : 'bg-slate-900 text-slate-400'}`}>
                {counts.cancelled_before}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('cancelled_not_received')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'cancelled_not_received'
                  ? 'bg-red-700 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>ملغي لعدم الاستلام</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${statusFilter === 'cancelled_not_received' ? 'bg-white text-red-800' : 'bg-slate-900 text-slate-400'}`}>
                {counts.cancelled_not_received}
              </span>
            </button>

          </div>
        </div>

        {/* Orders List / Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-xs font-bold text-slate-400">جار تحميل الطلبات...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 sm:p-14 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-inner">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {searchQuery ? 'لا توجد نتائج مطابقة' : 'شاشة المتابعة فارغة حالياً'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `لا توجد طلبات مطابقة لكلمة "${searchQuery}". جرب البحث برقم هاتف أو اسم آخر.`
                : 'الشاشة متصلة وجاهزة، بانتظار استلام طلبات جديدة من العملاء لتظهر هنا لحظياً.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => {
              const isPending = order.status === 'pending' || !order.status;
              const isConfirmed = order.status === 'confirmed' || order.status === 'preparing';
              const isCancelledBefore = order.status === 'cancelled_before_dispatch';
              const isCancelledNotReceived = order.status === 'cancelled_not_received';

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                    isPending
                      ? 'bg-slate-900/95 border-rose-500/50 shadow-[0_4px_25px_rgba(225,29,72,0.15)] ring-1 ring-rose-500/30'
                      : isConfirmed
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm'
                      : isCancelledBefore
                      ? 'bg-slate-900/70 border-amber-500/30 opacity-90'
                      : 'bg-slate-900/70 border-red-500/30 opacity-80'
                  }`}
                >
                  {/* Card Header: ID, Time, Status Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700/80 font-mono">
                          #{String(order.id).slice(-6)}
                        </span>
                        {order.created_at && (
                          <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1" title={order.created_at}>
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatOrderTime(order.created_at)}</span>
                            <span className="text-[10px] text-amber-400/80">({getTimeAgo(order.created_at)})</span>
                          </span>
                        )}
                      </div>

                      {/* Status Indicator Badge */}
                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10.5px] font-black">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span>جديد • ينتظر التأكيد</span>
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-black">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>مؤكد • قيد التحضير</span>
                          </span>
                        )}
                        {isCancelledBefore && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-black">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>ملغي قبل الخروج</span>
                          </span>
                        )}
                        {isCancelledNotReceived && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10.5px] font-black">
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span>ملغي (عدم استلام)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-black text-white">{order.customer_name}</h4>
                        <span className="text-xs font-black text-amber-400">
                          {order.total_amount} ج.م
                        </span>
                      </div>

                      {/* Phone with Fast Call & WhatsApp */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-200 font-mono bg-slate-950/90 px-3 py-2 rounded-xl border border-slate-800 flex-1 flex items-center justify-between shadow-inner">
                          <span>{order.customer_phone}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded-md">
                            {order.payment_method === 'vodafone_cash' ? 'محفظة' : order.payment_method === 'instapay' ? 'إنستاباي' : 'كاش'}
                          </span>
                        </span>
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 border border-blue-500/40 transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
                          title="اتصال بالعميل"
                        >
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                        </a>
                        <a
                          href={`https://wa.me/2${String(order.customer_phone).replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
                          title="محادثة واتساب"
                        >
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </a>
                      </div>

                      {/* Order Type & Zone */}
                      <div className="text-[11px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate">
                          {order.order_type === 'pickup' || order.delivery_zone === 'استلام من المطعم (تيك أواي)'
                            ? '🏬 استلام تيك أواي من المطعم'
                            : `🛵 توصيل: ${order.delivery_zone || 'سنهور القبلية'}`}
                        </span>
                      </div>

                      {/* Address & Building notes */}
                      {order.delivery_address && (
                        <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
                          <p className="font-medium">{order.delivery_address}</p>
                          {order.building_notes && (
                            <p className="text-[10.5px] text-amber-400/90 font-bold">
                              العمارة/الدور: {order.building_notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* مربع تفاصيل الطلب والأصناف وملاحظات الأوردر المتطور والمنظم */}
                      {(() => {
                        const parsed = parseOrderDetails(order.special_notes);
                        return (
                          <div className="bg-slate-950/80 rounded-2xl border border-slate-800/90 p-3 space-y-2.5 shadow-inner">
                            
                            {/* عنوان ورأس الأصناف */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                                <Utensils className="w-3.5 h-3.5" />
                                <span>الأصناف والوجبات المطلوبة ({order.items_count} صنف):</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                #{String(order.id).slice(-4)}
                              </span>
                            </div>

                            {/* قائمة الأصناف - كل طلب في سطر مستقل مع رقم الصنف والتفاصيل والسعر في نهاية السطر */}
                            {parsed.items.length > 0 ? (
                              <div className="space-y-1.5 pt-0.5">
                                {parsed.items.map((itemStr, idx) => {
                                  const itemInfo = parseItemLine(itemStr);
                                  const hasAlertNotes = Boolean(itemInfo.without || itemInfo.notes);

                                  return (
                                    <div
                                      key={idx}
                                      className={`rounded-2xl border transition-all p-2.5 space-y-2 ${
                                        hasAlertNotes
                                          ? 'bg-slate-900/98 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]'
                                          : 'bg-slate-900/95 border-slate-800/90 hover:bg-slate-900'
                                      }`}
                                    >
                                      {/* السطر الرئيسي للصنف: الرقم، الاسم، الحجم، الكمية، والشارة التنبيهية والسعر */}
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                                          <span className="w-5 h-5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-black shrink-0">
                                            {idx + 1}
                                          </span>
                                          
                                          <span className="font-black text-slate-100 text-xs">
                                            {itemInfo.name}
                                          </span>

                                          {itemInfo.size && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                                              {itemInfo.size}
                                            </span>
                                          )}

                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[11px] font-black font-mono">
                                            × {itemInfo.quantity}
                                          </span>

                                          </div>

                                          {/* سعر الصنف في نهاية السطر */}
                                          {itemInfo.price && (
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-black text-xs whitespace-nowrap shrink-0 shadow-xs">
                                              {itemInfo.price}
                                            </span>
                                          )}
                                        </div>

                                        {/* تنبيهات المستبعدات (بدون) والملاحظات للأصناف العادية بشكل بارز ومستقل */}
                                        {!itemInfo.isCustom && (itemInfo.without || itemInfo.notes || itemInfo.extras) && (
                                          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
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
                                                className="w-full flex items-center justify-between gap-2 bg-rose-950/50 hover:bg-rose-950/70 p-2 rounded-xl border border-rose-500/50 text-rose-200 shadow-xs cursor-pointer transition text-right animate-pulse"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="text-rose-400 font-black min-w-[75px] shrink-0 flex items-center gap-1">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                                    <span>🚫 بدون:</span>
                                                  </span>
                                                  <span className="text-rose-100 font-black tracking-wide">{itemInfo.without}</span>
                                                </div>
                                                <span className="text-[10px] text-rose-400 font-bold underline shrink-0">تكبير</span>
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
                                                className="w-full flex items-center justify-between gap-2 bg-amber-950/30 hover:bg-amber-950/50 p-2 rounded-xl border border-amber-500/30 text-amber-200 cursor-pointer transition text-right"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="text-amber-400 font-black min-w-[75px] shrink-0 flex items-center gap-1">
                                                    <span>📝 ملاحظات:</span>
                                                  </span>
                                                  <span className="text-white font-bold leading-relaxed">{itemInfo.notes}</span>
                                                </div>
                                                <span className="text-[10px] text-amber-400 font-bold underline shrink-0">تكبير</span>
                                              </button>
                                            )}

                                            {/* 3. الإضافات الملكية للصنف العادي */}
                                            {itemInfo.extras && (
                                              <div className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-xs">
                                                <span className="text-emerald-400 font-black min-w-[75px] shrink-0">✨ الإضافات:</span>
                                                <span className="text-emerald-200 font-bold">{itemInfo.extras}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                      {/* تفاصيل الطاجن المخصوص مرتبة سطر بسطر بالترتيب المطلوب بدقة:
                                          1. الأساس  2. بدون (مستبعدات الأساس)  3. البروتين  4. الشطة  5. الإضافات  6. ملاحظات */}
                                      {itemInfo.isCustom && (
                                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                                          
                                          {/* 1. الأساس */}
                                          {itemInfo.base && (
                                            <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                                              <span className="text-amber-400 font-black min-w-[75px] shrink-0">🍲 الأساس:</span>
                                              <span className="text-slate-100 font-bold">{itemInfo.base}</span>
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
                                              className="w-full flex items-center justify-between gap-2 bg-rose-950/50 hover:bg-rose-950/70 px-2.5 py-1.5 rounded-xl border border-rose-500/50 text-rose-200 shadow-xs cursor-pointer transition text-right"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="text-rose-400 font-black min-w-[75px] shrink-0 flex items-center gap-1">
                                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                                  <span>🚫 بدون:</span>
                                                </span>
                                                <span className="text-rose-100 font-black tracking-wide">{itemInfo.without}</span>
                                              </div>
                                              <span className="text-[10px] text-rose-400 font-bold underline shrink-0">تكبير</span>
                                            </button>
                                          )}

                                          {/* 3. البروتين (تحت الأساس والمستبعدات مباشرة) */}
                                          {itemInfo.protein && (
                                            <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                                              <span className="text-amber-400 font-black min-w-[75px] shrink-0">🥩 البروتين:</span>
                                              <span className="text-slate-100 font-bold leading-relaxed">{itemInfo.protein}</span>
                                            </div>
                                          )}

                                          {/* 4. الشطة */}
                                          {itemInfo.spice && (
                                            <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                                              <span className="text-amber-400 font-black min-w-[75px] shrink-0">🌶️ الشطة:</span>
                                              <span className="text-amber-300 font-bold">{itemInfo.spice}</span>
                                            </div>
                                          )}

                                          {/* 5. الإضافات الملكية والمقرمشات - تحت بعض داخل نفس الحاوية */}
                                          {itemInfo.extrasList && itemInfo.extrasList.length > 0 && (
                                            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                                              <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>الإضافات والمقرمشات ({itemInfo.extrasList.length}):</span>
                                              </div>
                                              <div className="space-y-1 pr-2 mr-1 border-r-2 border-emerald-500/30">
                                                {itemInfo.extrasList.map((extraItem, eIdx) => (
                                                  <div key={eIdx} className="flex items-center gap-2 text-xs font-bold text-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                                    <span>{extraItem}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* 6. ملاحظات الشيف الخاصة بالطاجن */}
                                          {itemInfo.notes && (
                                            <div className="flex items-center gap-2 bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-200">
                                              <span className="text-amber-400 font-black min-w-[75px] shrink-0">💬 ملاحظات:</span>
                                              <span className="text-white font-bold">{itemInfo.notes}</span>
                                            </div>
                                          )}

                                        </div>
                                      )}

                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs text-slate-300 py-2 font-medium bg-slate-900/80 px-3 rounded-xl border border-slate-800">
                                <span>عدد الأصناف: {order.items_count} صنف</span>
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-black text-xs">
                                  {order.subtotal || order.total_amount} ج.م
                                </span>
                              </div>
                            )}

                            {/* السطر التالي: ملاحظات الطلب والزبون بشكل بارز ومنظم */}
                            {parsed.notes ? (
                              <div className="pt-1.5 border-t border-slate-800/80">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-bold space-y-1">
                                  <span className="text-[11px] text-amber-400 font-black block">
                                    📌 ملاحظات الأوردر والزبون:
                                  </span>
                                  <p className="text-xs font-bold text-white leading-relaxed pr-1 whitespace-pre-wrap">
                                    {parsed.notes}
                                  </p>
                                </div>
                              </div>
                            ) : null}

                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* THE 3 ACTION BUTTONS */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      
                      {/* 1. Confirm Button */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'confirmed', 'مؤكد')}
                        disabled={isConfirmed}
                        className={`py-2 px-2 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          isConfirmed
                            ? 'bg-emerald-600 text-white shadow-md opacity-100 ring-2 ring-emerald-400/50'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                        }`}
                        title="تأكيد الأوردر وبدء التجهيز"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] sm:text-[11px]">
                          {isConfirmed ? 'تم التأكيد ✓' : 'تأكيد'}
                        </span>
                      </button>

                      {/* 2. Cancel Before Dispatch */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'cancelled_before_dispatch', 'ملغي قبل الخروج')}
                        disabled={isCancelledBefore}
                        className={`py-2 px-2 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          isCancelledBefore
                            ? 'bg-amber-600 text-white shadow-md opacity-100 ring-2 ring-amber-400/50'
                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30'
                        }`}
                        title="إلغاء الطلب قبل خروجه من المطعم"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] sm:text-[11px]">
                          {isCancelledBefore ? 'ملغي قبل الخروج' : 'إلغاء قبل خروجه'}
                        </span>
                      </button>

                      {/* 3. Cancel Not Received */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'cancelled_not_received', 'عدم استلام')}
                        disabled={isCancelledNotReceived}
                        className={`py-2 px-2 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          isCancelledNotReceived
                            ? 'bg-red-700 text-white shadow-md opacity-100 ring-2 ring-red-400/50'
                            : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                        }`}
                        title="إلغاء الطلب بسبب عدم استلام العميل"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-[10px] sm:text-[11px]">
                          {isCancelledNotReceived ? 'عدم استلام' : 'إلغاء "عدم استلام"'}
                        </span>
                      </button>

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* نافذة تفاعلية منبثقة عند الضغط على زر بدون أو الملاحظات للصنف */}
      {selectedItemNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>تعليمات الصنف للمطبخ</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedItemNote(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-black text-amber-400">
              {selectedItemNote.title}
            </div>

            {selectedItemNote.without && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl space-y-1">
                <span className="text-xs font-black text-rose-400 block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>مستبعدات الصنف (بدون):</span>
                </span>
                <p className="text-sm font-black text-rose-100 pr-1 leading-relaxed">
                  {selectedItemNote.without}
                </p>
              </div>
            )}

            {selectedItemNote.notes && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-1">
                <span className="text-xs font-black text-amber-400 block flex items-center gap-1.5">
                  <span>📝 ملاحظات خاصة للصنف:</span>
                </span>
                <p className="text-sm font-bold text-white pr-1 leading-relaxed">
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

    </div>
  );
}
