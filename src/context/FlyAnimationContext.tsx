'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface FlyingItem {
  id: string;
  imageUrl: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  targetX: number;
  targetY: number;
}

interface ReturningItem {
  id: string;
  imageUrl: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
}

interface FlyAnimationContextType {
  flyToCart: (sourceEl: HTMLElement | null, imageUrl: string) => void;
  returnFromCart: (targetEl: HTMLElement | null, imageUrl: string) => void;
}

const FlyAnimationContext = createContext<FlyAnimationContextType>({
  flyToCart: () => {},
  returnFromCart: () => {},
});

export const useFlyToCart = () => useContext(FlyAnimationContext);

export const FlyAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [returningItems, setReturningItems] = useState<ReturningItem[]>([]);
  const idCounter = useRef(0);

  const flyToCart = useCallback((sourceEl: HTMLElement | null, imageUrl: string) => {
    if (!sourceEl || typeof window === 'undefined') return;

    // Find cart target: check floating navbar cart capsule first, then mobile floating bar
    const cartEl =
      document.getElementById('floating-navbar-cart-btn') ||
      document.getElementById('mobile-floating-cart-btn');

    if (!cartEl) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();

    // Calculate source center
    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const startWidth = Math.min(Math.max(sourceRect.width, 60), 120);
    const startHeight = Math.min(Math.max(sourceRect.height, 60), 120);

    // Calculate target center
    const targetX = cartRect.left + cartRect.width / 2;
    const targetY = cartRect.top + cartRect.height / 2;

    const id = 'flying-item-' + Date.now() + '-' + (++idCounter.current);

    const newFlyingItem: FlyingItem = {
      id,
      imageUrl,
      startX,
      startY,
      startWidth,
      startHeight,
      targetX,
      targetY,
    };

    setFlyingItems((prev) => [...prev, newFlyingItem]);

    // Animate target cart bounce when the item arrives (after ~850ms)
    setTimeout(() => {
      cartEl.classList.remove('animate-cart-bump');
      void cartEl.offsetWidth;
      cartEl.classList.add('animate-cart-bump');
    }, 850);

    // Cleanup flying element after animation finishes
    setTimeout(() => {
      setFlyingItems((prev) => prev.filter((item) => item.id !== id));
    }, 1000);
  }, []);

  const returnFromCart = useCallback((targetEl: HTMLElement | null, imageUrl: string) => {
    if (!targetEl || typeof window === 'undefined') return;

    // Find cart origin
    const cartEl =
      document.getElementById('floating-navbar-cart-btn') ||
      document.getElementById('mobile-floating-cart-btn');

    if (!cartEl) return;

    const cartRect = cartEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Origin: Center of cart capsule
    const startX = cartRect.left + cartRect.width / 2;
    const startY = cartRect.top + cartRect.height / 2;

    // Target: Center of dish image container
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    const targetWidth = Math.min(Math.max(targetRect.width, 70), 130);
    const targetHeight = Math.min(Math.max(targetRect.height, 70), 130);

    const id = 'returning-item-' + Date.now() + '-' + (++idCounter.current);

    const newReturningItem: ReturningItem = {
      id,
      imageUrl,
      startX,
      startY,
      targetX,
      targetY,
      targetWidth,
      targetHeight,
    };

    // Cart brief pop as the item escapes
    cartEl.classList.remove('animate-cart-bump');
    void cartEl.offsetWidth;
    cartEl.classList.add('animate-cart-bump');

    setReturningItems((prev) => [...prev, newReturningItem]);

    // When item lands on target card (~900ms), bounce the target card
    setTimeout(() => {
      targetEl.classList.remove('animate-card-receive');
      void targetEl.offsetWidth;
      targetEl.classList.add('animate-card-receive');
    }, 900);

    // Cleanup returning item
    setTimeout(() => {
      setReturningItems((prev) => prev.filter((item) => item.id !== id));
    }, 1050);
  }, []);

  return (
    <FlyAnimationContext.Provider value={{ flyToCart, returnFromCart }}>
      {children}

      {/* Floating flying item portal overlay (Card -> Cart) */}
      {flyingItems.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
          {flyingItems.map((item) => (
            <div
              key={item.id}
              className="flying-dish-capsule"
              style={
                {
                  '--start-x': `${item.startX}px`,
                  '--start-y': `${item.startY}px`,
                  '--start-w': `${item.startWidth}px`,
                  '--start-h': `${item.startHeight}px`,
                  '--target-x': `${item.targetX}px`,
                  '--target-y': `${item.targetY}px`,
                  '--delta-x': `${item.targetX - item.startX}px`,
                  '--delta-y': `${item.targetY - item.startY}px`,
                } as React.CSSProperties
              }
            >
              {/* Luxury Flying Glow Bubble - دائرة واضحة ومجسمة مع إطار ذهبي لامع وظل فخم */}
              <div className="relative w-full h-full rounded-full p-1.5 bg-gradient-to-tr from-rose-600 via-amber-400 to-red-600 shadow-[0_15px_40px_rgba(225,29,72,0.85)] ring-4 ring-white/95 drop-shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt="طلب يطير للسلة"
                  className="w-full h-full object-cover rounded-full bg-white shadow-inner"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/25 via-transparent to-white/50 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Returning item portal overlay (Cart -> Card, Crumpled -> Unfolded) */}
      {returningItems.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
          {returningItems.map((item) => (
            <div
              key={item.id}
              className="returning-dish-capsule"
              style={
                {
                  '--start-x': `${item.startX}px`,
                  '--start-y': `${item.startY}px`,
                  '--target-w': `${item.targetWidth}px`,
                  '--target-h': `${item.targetHeight}px`,
                  '--target-x': `${item.targetX}px`,
                  '--target-y': `${item.targetY}px`,
                  '--delta-x': `${item.targetX - item.startX}px`,
                  '--delta-y': `${item.targetY - item.startY}px`,
                } as React.CSSProperties
              }
            >
              {/* Crumpled to Unfolding Dish Bubble */}
              <div className="relative w-full h-full p-1.5 bg-gradient-to-br from-amber-400 via-rose-600 to-red-700 shadow-[0_15px_45px_rgba(225,29,72,0.9)] ring-4 ring-amber-300/95 animate-crumple-unfold drop-shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt="طلب عائد من السلة"
                  className="w-full h-full object-cover rounded-full bg-white shadow-inner"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/25 via-transparent to-white/40 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      )}
    </FlyAnimationContext.Provider>
  );
};
