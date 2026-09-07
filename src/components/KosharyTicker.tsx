'use client';

import React from 'react';
import { Flame, Sparkles, Crown, Heart, Award } from 'lucide-react';

export const KosharyTicker: React.FC = () => {
  const tickerItems = [
    { text: 'لؤلؤة سنهور كشري وطواجن زمان على أصولها', icon: Crown },
    { text: 'طواجن فخار طالعة من الفرن مولعة وسخنة', icon: Flame },
    { text: 'تقلية دهب مقرمشة ومتبلة بالسر المخصوص', icon: Sparkles },
    { text: 'دقة خل وتوم وشطة زيت نار تحبس المزاج', icon: Award },
    { text: 'أرز بلبن فندقي مسكّت بالمكسرات والقشطة', icon: Heart },
    { text: 'توصيل فوري وسريع في سنهور وجميع قرى الفيوم', icon: Crown },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 py-3 text-white shadow-md border-y border-rose-500/80 select-none">
      {/* Subtle Glow Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 to-transparent pointer-events-none" />

      <div className="flex w-max animate-marquee space-x-10 space-x-reverse items-center">
        {[...tickerItems, ...tickerItems].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-2.5 px-6 shrink-0">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-amber-300">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black tracking-wide text-white drop-shadow-xs">
                {item.text}
              </span>
              <span className="text-amber-300 font-bold text-base mr-3">✦</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
