'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Phone, MessageCircle, Share2, ShoppingBag, Check, Sparkles } from 'lucide-react';
import { restaurantInfo } from '@/data/mockData';
import { useCartStore } from '@/lib/store';
import { useMenuStore, computeStoreStatus, defaultStoreScheduleSettings } from '@/lib/menuStore';
import { getWhatsAppMeLink } from '@/lib/whatsapp';
import { getTelHref } from '@/lib/contactLinks';

export const FloatingNavbar: React.FC = () => {
  const { getItemsCount, getTotal, setIsCartOpen } = useCartStore();
  const { storeScheduleSettings = defaultStoreScheduleSettings, ordersWhatsappNumber, restaurantPhoneNumber } = useMenuStore();
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
    <header className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-1.5 sm:px-4 md:px-6 pointer-events-none">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-rose-100/95 via-[#fff1f3]/98 to-red-100/95 backdrop-blur-2xl border border-rose-200/90 shadow-[0_15px_35px_-5px_rgba(225,29,72,0.18)] pointer-events-auto transition-all duration-300 hover:shadow-[0_20px_45px_-5px_rgba(225,29,72,0.28)]">
        
        {/* Right side: Logo & Brand Name */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 pr-0.5 min-w-0 flex-1">
          <div className="relative group cursor-pointer shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 via-amber-400 to-rose-600 rounded-full blur-xs opacity-80 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
            <div className="relative w-11.5 h-11.5 sm:w-13.5 sm:h-13.5 rounded-full overflow-hidden border border-white/40 bg-[#dc0b07] p-0.5 shadow-sm flex items-center justify-center">
              <Image
                src="/logo-transparent.png"
                alt={restaurantInfo.name}
                width={56}
                height={56}
                className="object-contain w-full h-full transform group-hover:scale-110 transition duration-300"
                priority
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[15px] sm:text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1 whitespace-nowrap">
                {restaurantInfo.name}
                <span className="text-amber-500 text-sm">👑</span>
              </span>
              
              {/* شارة حالة المطعم مع وميض ذكي: أخضر عند الفتح، أحمر متوهج عند الإغلاق أو الإجازة */}
              {storeStatus.isOpen ? (
                <span
                  title={storeStatus.detailText}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-xs whitespace-nowrap transition-all"
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
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300/80 shadow-xs whitespace-nowrap transition-all"
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
            <p className="text-[11px] sm:text-sm text-rose-600 font-black leading-tight tracking-tight mt-0.5">
              {restaurantInfo.tagline} • سنهور
            </p>
          </div>
        </div>

        {/* Center / Left: Quick Action Icons & Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 mr-1 sm:mr-2">
          
          {/* Quick Call */}
          <a
            href={getTelHref(restaurantPhoneNumber || restaurantInfo.phone)}
            className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/90 flex items-center justify-center text-rose-700 transition-all hover:scale-105 active:scale-95 shadow-sm"
            title="اتصل بالمطعم"
          >
            <Phone className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </a>

          {/* Quick WhatsApp */}
          <a
            href={getWhatsAppMeLink(ordersWhatsappNumber || restaurantInfo.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 flex items-center justify-center text-emerald-600 transition-all hover:scale-105 active:scale-95 shadow-sm"
            title="محادثة واتساب"
          >
            <MessageCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </a>

          {/* Share - Visible on all screens including mobile */}
          <button
            onClick={handleShare}
            className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 shadow-sm"
            title="مشاركة الرابط"
          >
            {copied ? <Check className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600" /> : <Share2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
          </button>

          {/* Floating Cart Capsule: Icon + Amount directly without the word "السلة" */}
          <button
            id="floating-navbar-cart-btn"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 sm:gap-2 h-9.5 sm:h-10.5 px-3 sm:px-4 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black shadow-md ruby-button-shadow transition-all duration-300 hover:scale-105 active:scale-95"
            title="سلة الطلبات"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              {itemsCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-white text-rose-700 text-[10px] font-black flex items-center justify-center shadow-xs border border-rose-100">
                  {itemsCount}
                </span>
              )}
            </div>
            
            {itemsCount > 0 ? (
              <span className="font-black text-xs sm:text-sm text-amber-200 whitespace-nowrap">
                {total} ج.م
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
