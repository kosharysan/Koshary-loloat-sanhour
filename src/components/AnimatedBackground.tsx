'use client';

import React from 'react';
import Image from 'next/image';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      
      {/* 1. Large, Eye-Catching Flowing Ruby & Amber Fluid Aurora Orbs */}
      <div className="absolute -top-24 -right-16 w-[750px] h-[750px] rounded-full bg-gradient-to-br from-rose-500/35 via-red-500/25 to-amber-300/25 blur-[80px] animate-float-slow-1" />
      
      <div className="absolute top-[28%] -left-28 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-rose-400/35 via-amber-300/25 to-red-400/25 blur-[80px] animate-float-slow-2" />
      
      <div className="absolute top-[60%] -right-24 w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-red-500/30 via-rose-300/25 to-amber-200/30 blur-[80px] animate-float-slow-3" />

      {/* 2. Fixed Central Watermark Logo (Always Centered, Faded & Gently Animated) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] lg:w-[560px] lg:h-[560px] opacity-[0.06] animate-logo-watermark">
          <Image
            src="/logo-transparent.png"
            alt="شعار لؤلؤة سنهور في الخلفية"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* 3. Subtle Luxury Geometric Pattern Grid Mesh */}
      <div className="absolute inset-0 luxury-pattern-overlay opacity-80" />

    </div>
  );
};
