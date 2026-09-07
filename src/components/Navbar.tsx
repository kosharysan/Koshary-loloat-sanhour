'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Phone, MessageCircle, Share2, ShoppingBag, Check } from 'lucide-react';
import { restaurantInfo } from '@/data/mockData';
import { useCartStore } from '@/lib/store';

export const Navbar: React.FC = () => {
  const { getItemsCount, setIsCartOpen } = useCartStore();
  const [copied, setCopied] = useState(false);
  const itemsCount = getItemsCount();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'لؤلؤة سنهور - كشري وطواجن',
          text: 'منيو لؤلؤة سنهور الفاخر - اطلب أشهى كشري وطواجن بالفيوم',
          url: window.location.href,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-rose-100/90 via-[#fff1f3]/95 to-red-100/90 backdrop-blur-xl border-b border-rose-200/90 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

        
        {/* Right side: Logo & Brand name */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative w-13 h-13 rounded-full overflow-hidden border-2 border-red-600 bg-white p-0.5 shadow-md flex items-center justify-center">
              <Image
                src={restaurantInfo.logoUrl}
                alt={restaurantInfo.name}
                width={52}
                height={52}
                className="object-contain w-full h-full transform group-hover:scale-110 transition duration-300"
                priority
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                {restaurantInfo.name}
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                مفتوح الآن
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              {restaurantInfo.tagline}
            </p>
          </div>
        </div>

        {/* Left side: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Call */}
          <a
            href={`tel:${restaurantInfo.phone}`}
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 flex items-center justify-center text-slate-700 hover:text-red-600 transition hover:scale-105 active:scale-95 shadow-sm"
            title="اتصل بالمطعم"
          >
            <Phone className="w-4 h-4" />
          </a>

          {/* Quick WhatsApp */}
          <a
            href={`https://wa.me/${restaurantInfo.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 transition hover:scale-105 active:scale-95 shadow-sm"
            title="محادثة واتساب"
          >
            <MessageCircle className="w-4 h-4" />
          </a>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 transition hover:scale-105 active:scale-95 shadow-sm"
            title="مشاركة الرابط"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm ruby-button-shadow transition hover:scale-105 active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">السلة</span>
            {itemsCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-black text-red-700 bg-white rounded-full shadow-sm animate-bounce">
                {itemsCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
