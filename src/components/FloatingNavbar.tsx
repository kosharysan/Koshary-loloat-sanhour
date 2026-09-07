'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Phone, MessageCircle, Share2, ShoppingBag, Check, Sparkles } from 'lucide-react';
import { restaurantInfo } from '@/data/mockData';
import { useCartStore } from '@/lib/store';
import { useMenuStore, computeStoreStatus, defaultStoreScheduleSettings } from '@/lib/menuStore';

export const FloatingNavbar: React.FC = () => {
  const { getItemsCount, getTotal, setIsCartOpen } = useCartStore();
  const { storeScheduleSettings = defaultStoreScheduleSettings } = useMenuStore();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    // تحديث التوقيت كل دقيقة لحساب المواعيد بدقة ولحظياً
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const itemsCount = mounted ? getItemsCount() : 0;
  const total = mounted ? getTotal() : 0;

  // الحساب اللحظي لحالة المطعم (مفتوح / مغلق / إجازة)
  const storeStatus = mounted
    ? computeStoreStatus(storeScheduleSettings, currentTime)
    : { isOpen: true, reason: 'open' as const, badgeText: 'مفتوح', detailText: '' };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'لؤلؤة سنهور - كشري وطواجن',
          text: 'منيو لؤلؤة سنهور الفاخر - اطلب أشهى كشري وطواجن بالفيوم',
          url: window.location.href,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="fixed top-2.5 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4 pointer-events-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between p-1.5 pl-2 sm:p-2 sm:pl-3 rounded-full bg-gradient-to-r from-rose-100/90 via-[#fff1f3]/95 to-red-100/90 backdrop-blur-2xl border border-rose-200/90 shadow-[0_15px_35px_-5px_rgba(225,29,72,0.16)] pointer-events-auto transition-all duration-300 hover:shadow-[0_20px_45px_-5px_rgba(225,29,72,0.25)]">
        
        {/* Right side: Logo & Brand Name */}
        <div className="flex items-center gap-2 sm:gap-3 pr-0.5 sm:pr-1 min-w-0 flex-1">
          <div className="relative group cursor-pointer shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 via-amber-400 to-rose-600 rounded-full blur-xs opacity-80 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-[0.5px] border-white/30 bg-[#dc0b07] p-0.5 shadow-sm flex items-center justify-center">
              <Image
                src="/logo-transparent.png"
                alt={restaurantInfo.name}
                width={48}
                height={48}
                className="object-contain w-full h-full transform group-hover:scale-110 transition duration-300"
                priority
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1 whitespace-nowrap">
                {restaurantInfo.name}
                <span className="text-amber-500 text-xs">👑</span>
              </span>
              
              {/* شارة حالة المطعم مع وميض ذكي: أخضر عند الفتح، أحمر متوهج عند الإغلاق أو الإجازة */}
              {storeStatus.isOpen ? (
                <span
                  title={storeStatus.detailText}
                  className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-xs whitespace-nowrap transition-all"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden xs:inline">مفتوح</span>
                </span>
              ) : (
                <span
                  title={storeStatus.detailText}
                  className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300/80 shadow-xs whitespace-nowrap transition-all"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <span className="hidden xs:inline font-bold">
                    {storeStatus.reason === 'vacation' ? 'إجازة' : 'مغلق'}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[9.5px] sm:text-xs text-rose-600 font-black leading-tight tracking-tight mt-0.5">
              {restaurantInfo.tagline} • سنهور
            </p>
          </div>
        </div>

        {/* Center / Left: Quick Action Icons & Cart */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 mr-1 sm:mr-2">
          
          {/* Quick Call */}
          <a
            href={`tel:${restaurantInfo.phone}`}
            className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200/80 flex items-center justify-center text-rose-700 transition hover:scale-105 active:scale-95 shadow-xs"
            title="اتصل بالمطعم"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </a>

          {/* Quick WhatsApp */}
          <a
            href={`https://wa.me/${restaurantInfo.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 transition hover:scale-105 active:scale-95 shadow-xs"
            title="محادثة واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </a>

          {/* Share - Visible on all screens including mobile */}
          <button
            onClick={handleShare}
            className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 transition hover:scale-105 active:scale-95 shadow-xs"
            title="مشاركة الرابط"
          >
            {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Floating Cart Capsule: Icon + Amount directly without the word "السلة" */}
          <button
            id="floating-navbar-cart-btn"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-md ruby-button-shadow transition-all duration-300 hover:scale-105 active:scale-95 mr-0.5"
            title="سلة الطلبات"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {itemsCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-white text-rose-700 text-[9px] font-black flex items-center justify-center shadow-xs">
                  {itemsCount}
                </span>
              )}
            </div>
            
            {itemsCount > 0 ? (
              <span className="font-black text-[11px] sm:text-xs text-amber-200 whitespace-nowrap">
                {total} ج.م
              </span>
            ) : (
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-300 animate-ping"></span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
