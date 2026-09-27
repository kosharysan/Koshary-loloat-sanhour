'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
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
        transition: 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`fixed ${
        hasCartBar ? 'bottom-28 sm:bottom-30' : 'bottom-6 sm:bottom-8'
      } right-4 sm:right-6 z-40 pointer-events-auto select-none`}
    >
      <div className="luxury-fab-wrap">
        <button
          id="floating-tour-replay-btn"
          type="button"
          onClick={handleClick}
          className="luxury-fab luxury-fab-gold transition-transform duration-300 hover:scale-105 active:scale-95"
          title="كيف تطلب؟"
          aria-label="كيف تطلب؟ جولة توضيحية"
        >
          <span className="luxury-fab-sheen" />
          <span className="luxury-fab-icon">
            <Lightbulb className="text-[#f8e6b0] fill-[#f5d48a]/80" strokeWidth={2} />
          </span>
        </button>
      </div>
    </div>
  );
};
