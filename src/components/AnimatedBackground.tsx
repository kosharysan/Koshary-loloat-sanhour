'use client';

import React from 'react';
import Image from 'next/image';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transform-gpu">
      
      {/* 0. Base Radial Gradients (Hardware accelerated layer, 0 scroll repaints) */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(at 0% 0%, rgba(254, 226, 226, 0.7) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(255, 228, 230, 0.6) 0px, transparent 50%),
            radial-gradient(at 50% 50%, rgba(255, 241, 242, 0.5) 0px, transparent 60%),
            radial-gradient(at 100% 100%, rgba(254, 242, 242, 0.7) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(255, 228, 230, 0.6) 0px, transparent 50%)
          `
        }}
      />
      
      {/* 1. Fluid Aurora Orbs (Optimized blur with will-change-transform for butter-smooth 60/120fps) */}
      <div className="absolute -top-24 -right-16 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-500/25 via-red-500/20 to-amber-300/20 blur-[50px] animate-float-slow-1 will-change-transform" />
      
      <div className="absolute top-[28%] -left-28 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-rose-400/25 via-amber-300/20 to-red-400/20 blur-[50px] animate-float-slow-2 will-change-transform" />
      
      <div className="absolute top-[60%] -right-24 w-[550px] h-[550px] rounded-full bg-gradient-to-tl from-red-500/25 via-rose-300/20 to-amber-200/20 blur-[50px] animate-float-slow-3 will-change-transform" />

      {/* 2. Fixed Central Watermark Logo (Always Centered, Faded & Gently Animated) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] lg:w-[560px] lg:h-[560px] opacity-[0.06] animate-logo-watermark will-change-transform">
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
