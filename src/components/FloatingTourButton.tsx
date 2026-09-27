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
  const [isHovered, setIsHovered] = useState(false);

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
        hasCartBar ? 'bottom-28 sm:bottom-30' : 'bottom-6 sm:bottom-8'
      } right-4 sm:right-6 z-40 pointer-events-auto select-none`}
    >
      <div 
        className="group relative flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tooltip popping out to the left on hover - styled in restaurant brand colors */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 right-[calc(100%+12px)] pointer-events-none transition-all duration-300 ease-out z-50 ${
            isHovered
              ? 'opacity-100 translate-x-0 scale-100'
              : 'opacity-0 translate-x-3 scale-95'
          }`}
          role="tooltip"
        >
          <div className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#541911] via-[#7a2217] to-[#541911] text-amber-200 border border-amber-400/60 shadow-[0_10px_25px_rgba(84,25,17,0.65),0_0_15px_rgba(245,158,11,0.3)] backdrop-blur-md whitespace-nowrap text-xs sm:text-sm font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
            <span>كيف تطلب؟</span>
            {/* Tooltip Arrow pointing to the circle */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-[#541911] border-r border-t border-amber-400/60 rotate-45" />
          </div>
        </div>

        {/* Circular Floating Button - styled in royal crimson & gold identity */}
        <button
          id="floating-tour-replay-btn"
          type="button"
          onClick={handleClick}
          className="relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#541911] via-[#8c2c1f] to-[#b84838] text-amber-300 shadow-[0_8px_25px_rgba(84,25,17,0.65),0_0_15px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_32px_rgba(84,25,17,0.85),0_0_20px_rgba(245,158,11,0.55)] border-2 border-amber-300/90 transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer overflow-hidden"
          title="كيف تطلب؟"
          aria-label="كيف تطلب؟ جولة توضيحية"
        >
          {/* Shimmer sweep animation */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

          {/* Pulsing indicator dot */}
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 border border-white"></span>
          </span>

          {/* Lightbulb Icon with slight pulse and gold glow */}
          <Lightbulb className="w-6 h-6 text-amber-300 fill-amber-400 stroke-[2] drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] transition-transform duration-300 group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
};
