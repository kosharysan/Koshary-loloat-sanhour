'use client';

import React from 'react';
import Image from 'next/image';
import { Phone, MessageCircle, MapPin, Clock, Heart } from 'lucide-react';
import { restaurantInfo } from '@/data/mockData';
import { useMenuStore } from '@/lib/menuStore';
import { getWhatsAppMeLink } from '@/lib/whatsapp';
import { getTelHref } from '@/lib/contactLinks';

export const Footer: React.FC = () => {
  const ordersWhatsappNumber = useMenuStore((state) => state.ordersWhatsappNumber);
  const restaurantPhoneNumber = useMenuStore((state) => state.restaurantPhoneNumber);

  return (
    <footer className="mt-20 px-4 pb-12">
      <div className="max-w-5xl mx-auto rounded-[2.5rem] bg-white/70 backdrop-blur-2xl border border-rose-200/80 shadow-[0_15px_40px_-5px_rgba(225,29,72,0.12)] p-6 sm:p-10 space-y-6">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          
          {/* Brand Info */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-rose-200/90 bg-white p-1 shadow-md shrink-0">
              <Image
                src="/logo-transparent.png"
                alt={restaurantInfo.name}
                width={64}
                height={64}
                className="object-contain w-full h-full"
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                <span>{restaurantInfo.name}</span>
                <span className="text-amber-500 text-sm">👑</span>
              </h3>
              <p className="text-xs text-rose-600 font-black">
                {restaurantInfo.tagline} • سنهور القبلية
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm font-medium">
                كشري وطواجن زمان على أصولها - تجربة طعام ملكية في قلب الفيوم.
              </p>
            </div>
          </div>

          {/* Quick Contact Icons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={getTelHref(restaurantPhoneNumber || restaurantInfo.phone)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-rose-50 border border-rose-200/80 hover:border-rose-400 text-slate-800 hover:text-rose-600 font-bold transition shadow-xs text-xs"
            >
              <Phone className="w-4 h-4 text-rose-600" />
              <span>{restaurantPhoneNumber || restaurantInfo.phone}</span>
            </a>

            <a
              href={getWhatsAppMeLink(ordersWhatsappNumber || restaurantInfo.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-black transition shadow-xs text-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>واتساب المطعم</span>
            </a>
          </div>

        </div>

        {/* Location & Times Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-rose-100/80 text-xs">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-700 font-bold">
            <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{restaurantInfo.address}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-700 font-bold">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{restaurantInfo.workingHours}</span>
          </div>
        </div>

        {/* Bottom copyright & Discreet Admin Access */}
        <div className="pt-4 border-t border-rose-100/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center justify-center gap-1.5">
            <span>جميع الحقوق محفوظة © {new Date().getFullYear()} مطعم {restaurantInfo.name} | طعم لا يُنسى</span>
            <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
          </div>
          <a
            href="/admin"
            title="بوابة إدارة المطعم"
            className="text-slate-400 hover:text-rose-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200/60"
          >
            <span className="text-[10px]">بوابة الإدارة</span>
            <span className="text-xs">🔒</span>
          </a>
        </div>

      </div>
    </footer>
  );
};
