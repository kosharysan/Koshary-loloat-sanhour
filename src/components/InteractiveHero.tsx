'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Sparkles, Flame, Star, ShoppingBag, ArrowLeft, ShieldCheck, Heart, Utensils, Wand2 } from 'lucide-react';
import { menuItems, restaurantInfo } from '@/data/mockData';
import { useCartStore } from '@/lib/store';
import { useMenuStore } from '@/lib/menuStore';
import { sounds } from '@/lib/sound';
import { useFlyToCart } from '@/context/FlyAnimationContext';

interface InteractiveHeroProps {
  onNavigateToMenu?: () => void;
  onToggleDishBuilder?: () => void;
  isDishBuilderOpen?: boolean;
}

export const InteractiveHero: React.FC<InteractiveHeroProps> = ({
  onNavigateToMenu,
  onToggleDishBuilder,
  isDishBuilderOpen = false,
}) => {
  const { addItem, setIsCartOpen } = useCartStore();
  const { items, heroFeaturedItemId, heroFeaturedItemIds, heroBadgeText, dishBuilderSettings } = useMenuStore();

  // Filter out any dishes that are disabled / unavailable
  const availableItems = items.filter(i => i.isAvailable !== false);

  // Resolve featured dishes from heroFeaturedItemIds (1 to 4 dishes) that are currently available
  const resolvedFeaturedDishes = (heroFeaturedItemIds && heroFeaturedItemIds.length > 0)
    ? (heroFeaturedItemIds.map(id => availableItems.find(i => i.id === id)).filter(Boolean) as typeof items)
    : [];

  const featuredDishes = resolvedFeaturedDishes.length > 0
    ? resolvedFeaturedDishes
    : [
        availableItems.find(i => i.id === heroFeaturedItemId),
        availableItems.find(i => i.id === 'box-special'),
        availableItems.find(i => i.id === 'tagine-royal-mix'),
        availableItems.find(i => i.id === 'tagine-meat'),
        availableItems[0]
      ].filter(Boolean) as typeof items;

  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = activeIndex >= featuredDishes.length ? 0 : activeIndex;
  const activeDish = featuredDishes[safeActiveIndex] || featuredDishes[0] || availableItems[0] || items[0];

  const { flyToCart } = useFlyToCart();
  const heroImageRef = useRef<HTMLDivElement>(null);

  const [dishImgError, setDishImgError] = useState(false);
  useEffect(() => {
    setDishImgError(false);
  }, [activeDish?.id, activeDish?.imageUrl]);

  const handleAddHeroDish = () => {
    sounds.playAddChime();
    if (heroImageRef.current) {
      flyToCart(heroImageRef.current, activeDish.imageUrl || '/menu/koshary-box.jpg');
    }
    addItem(activeDish, 1);
  };

  return (
    <section className="relative pt-24 pb-12 overflow-hidden">
      
      {/* Background radial luxury lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[750px] h-[550px] bg-gradient-to-b from-rose-200/40 via-red-100/30 to-transparent rounded-full blur-[140px] pointer-events-none -z-10"></div>

      <div className="max-w-6xl mx-auto px-4">
        
        {/* Brand Official Identity Hero Banner */}
        <div className="text-center flex flex-col items-center space-y-4 mb-6">
          
          {/* Prominent Official Logo Emblem */}
          <div className="relative group cursor-pointer">
            {/* Ambient Animated Aura */}
            <div className="absolute -inset-2 bg-gradient-to-r from-rose-600 via-amber-400 to-red-600 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse"></div>
            
            {/* Outer Gold Ring */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white p-2 shadow-[0_15px_40px_rgba(225,29,72,0.25)] border-4 border-amber-300 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
              <div className="relative w-full h-full rounded-full overflow-hidden bg-transparent flex items-center justify-center">
                <Image
                  src="/logo-transparent.png"
                  alt={restaurantInfo.name}
                  fill
                  sizes="144px"
                  className="object-contain p-1 drop-shadow-sm"
                  priority
                />
              </div>
            </div>

            {/* Official Badge Stamp */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white text-[11px] sm:text-xs font-black shadow-md border-2 border-white whitespace-nowrap flex items-center gap-1">
              <span>👑 الشعار الرسمي المعتمد</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/95 border-2 border-rose-200 shadow-[0_8px_25px_rgba(225,29,72,0.15)] text-rose-700 text-xs sm:text-sm font-black backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>كشري وطواجن زمان على أصولها الفندقية</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-800">سنهور المدينة - الفيوم</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            تذوّق أصل الكشري والطواجن في{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-l from-rose-600 via-red-600 to-amber-500 bg-clip-text text-transparent">
                لؤلؤة سنهور 👑
              </span>
              <span className="absolute -bottom-1.5 left-0 right-0 h-3 bg-rose-300/35 -rotate-1 rounded-full -z-10"></span>
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-700 max-w-2xl mx-auto font-bold leading-relaxed">
            🍲 طواجن فخار طالعة من الفرن طازجة وسخنة • 🧅 تقلية دهب مقرمشة • 🌶️ دقة وشطة زيت على الأصول المصرية
          </p>
        </div>

        {/* Central 3D Interactive Stage Card - Chic Medium Red Luxury Styling */}
        <div className="relative rounded-[2.5rem] elevated-stage-ruby p-6 sm:p-10 lg:p-12 overflow-hidden text-white">
          
          {/* Subtle Glow Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,_rgba(255,255,255,0.18)_0%,_transparent_60%)] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[460px]">
            
            {/* Right Side (lg:col-span-5): Official Logo Showcase with subtle warm backlight */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-6 select-none order-1 lg:order-1">
              
              {/* Soft Golden/White Aura Ring behind Logo */}
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-white/15 blur-3xl pointer-events-none"></div>

              {/* Logo Container */}
              <div className="relative w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] lg:w-[400px] lg:h-[400px] flex items-center justify-center transition-transform duration-700 hover:scale-105">
                <Image
                  src="/logo-transparent.png"
                  alt="شعار لؤلؤة سنهور المعتمد"
                  fill
                  sizes="(max-width: 768px) 350px, 400px"
                  className="object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
                  priority
                />
              </div>

              {/* Subtitle Stamp below Logo */}
              <div className="mt-3 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-black shadow-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                <span>العلامة الأصلية • كشري وطواجن زمان</span>
              </div>

            </div>

            {/* Left Side (lg:col-span-7): All Dish Info, Dish Thumbnail, Tabs & Order CTA */}
            <div className="lg:col-span-7 text-center lg:text-right space-y-6 order-2 lg:order-2">
              
              {/* Dish Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                {featuredDishes.map((dish, idx) => (
                  <button
                    key={dish.id}
                    onClick={() => {
                      sounds.playAddChime();
                      setActiveIndex(idx);
                    }}
                    className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 ${
                      safeActiveIndex === idx
                        ? 'bg-white text-rose-900 shadow-lg scale-105 font-black'
                        : 'bg-black/20 hover:bg-black/30 text-white border border-white/20'
                    }`}
                  >
                    {dish.name}
                  </button>
                ))}
              </div>

              {/* Free-Floating 3D Dish Stage (No enclosing box) */}
              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                
                {/* 3D Free-Floating Dish Circle with interactive hover & animated orbit ring */}
                <div className="relative group cursor-pointer shrink-0">
                  {/* Outer animated rotating dashed orbit ring */}
                  <div className="absolute -inset-3 rounded-full border-2 border-dashed border-amber-300/40 animate-spin-slow pointer-events-none"></div>
                  
                  {/* Warm back glow */}
                  <div className="absolute -inset-2 bg-gradient-to-tr from-amber-400/30 to-white/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>

                  {/* Free-Floating Circular Dish Container */}
                  <div 
                    ref={heroImageRef}
                    className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden p-1.5 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-4 border-white/90 transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                  >
                    <Image
                      src={dishImgError || !activeDish?.imageUrl ? '/menu/koshary-box.jpg' : activeDish.imageUrl}
                      alt={activeDish?.name || 'صنف المنيو'}
                      fill
                      sizes="(max-width: 768px) 150px, 200px"
                      className="object-cover rounded-full group-hover:scale-105 transition-transform duration-700"
                      priority
                      onError={() => setDishImgError(true)}
                    />
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-white text-rose-900 text-[11px] font-black px-3.5 py-1 rounded-full shadow-lg border border-white flex items-center gap-1.5 whitespace-nowrap animate-bounce-short">
                    <span>{heroBadgeText || 'جاهز للطلب فوراً 🚀'}</span>
                  </div>
                </div>

                {/* Dish Story Text & Badges */}
                <div className="space-y-2 text-center sm:text-right flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-400/25 border border-amber-300/40 text-amber-200">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      الأعلى تقييماً (4.9/5)
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-white/20 border border-white/30 text-rose-100">
                      <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      طازج من الفرن فوري
                    </span>
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                    {activeDish.name}
                  </h3>
                  
                  <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed font-medium">
                    {activeDish.description}
                  </p>
                </div>

              </div>

              {/* Price & Chef Notes */}
              <div className="p-4 rounded-2xl bg-black/25 backdrop-blur-md border border-white/20 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-200 block font-bold">السعر الملوكي:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white drop-shadow-xs">
                      {activeDish.price}
                    </span>
                    <span className="text-sm font-black text-amber-300">
                      جنيه مصري
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-500/40 inline-block">
                    ✓ متاح للطلب والتوصيل الفوري
                  </span>
                </div>
              </div>

              {/* Add to Cart Hero Button */}
              <div className="pt-1">
                <button
                  onClick={handleAddHeroDish}
                  className="w-full py-4 px-8 rounded-2xl bg-white hover:bg-rose-50 text-rose-900 font-black text-base shadow-2xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShoppingBag className="w-5 h-5 text-rose-700" />
                  <span className="text-rose-900">اطلب هذا الطبق الآن</span>
                  <ArrowLeft className="w-5 h-5 text-rose-700" />
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Action Buttons directly under the Main Card */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 max-w-2xl mx-auto">
          
          {/* Button 1: المنيو */}
          <button
            type="button"
            onClick={onNavigateToMenu}
            className={`w-full ${
              dishBuilderSettings?.isEnabled ? 'sm:flex-1' : 'sm:max-w-md'
            } py-4 px-6 rounded-2xl bg-white/90 hover:bg-white text-slate-900 border-2 border-rose-200/90 hover:border-rose-400 font-black text-base shadow-[0_12px_30px_rgba(225,29,72,0.12)] hover:shadow-[0_18px_35px_rgba(225,29,72,0.22)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3.5 group cursor-pointer`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300 shadow-xs shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="block text-sm sm:text-base font-black text-slate-900 leading-tight">
                قائمة الطعام (المنيو)
              </span>
              <span className="text-[11px] text-rose-600 font-bold">
                تصفح جميع الأصناف ⬇️
              </span>
            </div>
          </button>

          {/* Button 2: صمّم طاجنك الخاص (يظهر فقط إذا كان الكارت مفعلاً من الإدارة) */}
          {dishBuilderSettings?.isEnabled && (
            <button
              type="button"
              onClick={onToggleDishBuilder}
              className={`w-full sm:flex-1 py-4 px-6 rounded-2xl font-black text-base shadow-[0_12px_35px_rgba(225,29,72,0.25)] hover:shadow-[0_18px_45px_rgba(225,29,72,0.35)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3.5 border-2 cursor-pointer ${
                isDishBuilderOpen
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white border-rose-400/60 ruby-button-shadow'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs shrink-0">
                <Wand2 className={`w-5 h-5 ${isDishBuilderOpen ? 'rotate-45' : 'animate-pulse'}`} />
              </div>
              <div className="text-right">
                <span className="block text-sm sm:text-base font-black text-white leading-tight">
                  صمّم طاجنك الخاص
                </span>
                <span className="text-[11px] text-amber-200 font-bold flex items-center gap-1">
                  {isDishBuilderOpen ? 'إغلاق أداة التصميم ✕' : 'ابتكر طاجنك الآن 👨‍🍳'}
                </span>
              </div>
            </button>
          )}

        </div>

      </div>
    </section>
  );
};
