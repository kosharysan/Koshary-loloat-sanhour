'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { sounds } from '@/lib/sound';

interface FloatingTourButtonProps {
  isTourOpen?: boolean;
}

export const FloatingTourButton: React.FC<FloatingTourButtonProps> = ({ isTourOpen = false }) => {
  const { getItemsCount, isCartOpen } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isCartOpen || isTourOpen) return null;

  const count = getItemsCount();
  const hasCartBar = count > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    sounds.playAddChime();
    window.dispatchEvent(new CustomEvent('open-onboarding-tour'));
  };

  return (
    <div
      style={{
        transition: 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease',
      }}
      className={`fixed ${
        hasCartBar ? 'bottom-22 sm:bottom-24' : 'bottom-5 sm:bottom-6'
      } right-3 sm:right-6 z-40 pointer-events-auto select-none`}
    >
      <button
        id="floating-tour-replay-btn"
        type="button"
        onClick={handleClick}
        className="group relative flex items-center gap-2 py-2.5 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-black shadow-[0_10px_25px_rgba(245,158,11,0.45),0_0_15px_rgba(255,255,255,0.7)] hover:shadow-[0_15px_35px_rgba(245,158,11,0.65)] border-2 border-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden"
        title="شرح خطوات الطلب بالتفصيل (جولة إرشادية)"
        aria-label="كيف تطلب؟ جولة توضيحية"
      >
        {/* Shimmer sweep animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
        </span>

        {/* Lightbulb Icon with gentle bounce */}
        <div className="relative flex items-center justify-center">
          <Lightbulb className="w-4.5 h-4.5 text-slate-950 fill-amber-400 stroke-[2.5]" />
        </div>

        {/* Text Label */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black whitespace-nowrap text-slate-950 drop-shadow-2xs">
            كيف تطلب؟
          </span>
          <span className="text-[10px] font-black text-amber-950 bg-white/60 px-1.5 py-0.5 rounded-full border border-amber-400/40 hidden sm:inline-block shadow-2xs">
            💡 دليل الطلب
          </span>
        </div>
      </button>
    </div>
  );
};
