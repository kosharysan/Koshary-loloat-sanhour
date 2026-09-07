'use client';

import React from 'react';
import Image from 'next/image';
import { MapPin, Clock, ShieldCheck, Flame, Sparkles, Award } from 'lucide-react';
import { restaurantInfo } from '@/data/mockData';

export const HeroBanner: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-6 pb-8">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-10 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-rose-200/50 to-pink-200/30 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-amber-200/40 to-rose-100/40 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden pearl-hero-card p-6 sm:p-10">
          
          {/* Subtle logo watermark in corner */}
          <div className="absolute -left-12 -bottom-12 w-80 h-80 opacity-[0.04] pointer-events-none">
            <Image
              src={restaurantInfo.logoUrl}
              alt="Motif"
              width={320}
              height={320}
              className="object-contain"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            
            {/* Right: Info and Text */}
            <div className="text-center md:text-right space-y-4 max-w-xl">
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border border-rose-200 text-rose-800 text-xs font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>المنيو الملكي المعتمد | أصالة الطعم وفخامة التقديم</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                طعم زمان الملوكي في{' '}
                <span className="bg-gradient-to-l from-rose-600 via-red-600 to-amber-600 bg-clip-text text-transparent drop-shadow-xs">
                  لؤلؤة سنهور
                </span>
              </h2>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                {restaurantInfo.description}
              </p>

              {/* Meta pills with delicate rose borders */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs pt-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 border border-rose-200/70 text-slate-800 shadow-xs font-bold">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>{restaurantInfo.address}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 border border-rose-200/70 text-slate-800 shadow-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>{restaurantInfo.workingHours}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 border border-rose-200/70 text-slate-800 shadow-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>تغليف حراري معقم وفاخر</span>
                </div>
              </div>

            </div>

            {/* Left: Featured Highlight Logo Medallion */}
            <div className="w-full md:w-auto flex flex-col items-center">
              <div className="relative p-2.5 rounded-3xl bg-gradient-to-b from-rose-200/80 via-red-100/60 to-white shadow-xl border border-rose-200/80">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden bg-white flex items-center justify-center p-3 border border-rose-100 shadow-inner">
                  <Image
                    src={restaurantInfo.logoUrl}
                    alt="لؤلؤة سنهور - شعار"
                    width={240}
                    height={240}
                    className="object-contain w-full h-full drop-shadow-md transform hover:scale-105 transition duration-500"
                  />
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="text-xs font-black text-rose-700 bg-white/95 px-3.5 py-1 rounded-full border border-rose-200 inline-flex items-center gap-1.5 shadow-md">
                      <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-600 animate-pulse" />
                      طواجن فخار طازجة من الفرن
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
