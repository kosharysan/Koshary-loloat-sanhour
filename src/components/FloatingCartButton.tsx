'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/lib/store';

export const FloatingCartButton: React.FC = () => {
  const { getItemsCount, getTotal, setIsCartOpen, isCartOpen } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted ? getItemsCount() : 0;
  const total = mounted ? getTotal() : 0;

  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  if (!mounted || count === 0 || isCartOpen) return null;

  const isMoved = isHovered || isPressed;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPressed(true);
    // Smooth glide across before opening drawer
    const delay = isHovered ? 160 : 380;
    setTimeout(() => {
      setIsCartOpen(true);
      setIsPressed(false);
    }, delay);
  };

  return (
    <div className="fixed bottom-5 left-4 right-4 z-30 max-w-md mx-auto pointer-events-auto">
      <button
        id="mobile-floating-cart-btn"
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsPressed(false), 450);
        }}
        className="group relative w-full py-3.5 px-4 sm:px-6 rounded-2xl bg-gradient-to-r from-[#541911] via-[#8c2c1f] to-[#541911] text-rose-50 font-black shadow-2xl shadow-[#380e08]/70 hover:shadow-[#541911]/80 flex items-center justify-between border border-[#b84838]/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none cursor-pointer overflow-hidden"
      >
        {/* Subtle warm shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Right: Cart Title & Count Badge */}
        <div className="relative flex items-center gap-2.5 z-10 shrink-0 select-none">
          <div className="relative w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-rose-100 shadow-inner">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-[#541911] text-xs font-black flex items-center justify-center shadow-md">
              {count}
            </span>
          </div>
          <span className="text-sm sm:text-base font-black tracking-wide whitespace-nowrap drop-shadow-sm">
            سلة الطلبات ({count})
          </span>
        </div>

        {/* Middle Runway for Koshary Box */}
        <div className="relative flex-1 h-11 mx-2 pointer-events-none">
          <div
            style={{
              right: isMoved ? 'calc(100% - 50px)' : '8px',
              transition: 'all 0.65s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            className={`absolute top-1/2 -translate-y-1/2 w-[42px] h-[42px] flex items-center justify-center will-change-[right,transform] ${
              isMoved
                ? '-rotate-12 scale-110 drop-shadow-[0_8px_14px_rgba(0,0,0,0.6)]'
                : 'rotate-0 scale-100 drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)]'
            }`}
          >
            <img
              src="/koshary-box-transparent.png"
              alt="علبة كشري هندسة"
              className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-500"
              draggable={false}
            />
          </div>
        </div>

        {/* Left: Total Price & Arrow */}
        <div className="relative flex items-center gap-2 z-10 shrink-0 select-none">
          <span className="text-base sm:text-lg font-black text-amber-200 drop-shadow-sm whitespace-nowrap">
            {total} ج.م
          </span>
          <ArrowLeft
            className={`w-5 h-5 text-amber-200 transition-transform duration-300 ${
              isMoved ? '-translate-x-1' : ''
            }`}
          />
        </div>
      </button>
    </div>
  );
};

