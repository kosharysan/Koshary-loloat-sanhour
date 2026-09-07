'use client';

import React from 'react';
import Image from 'next/image';
import { Sparkles, Flame, Star, Plus, ArrowLeft, ShoppingBag } from 'lucide-react';
import { menuItems } from '@/data/mockData';
import { useCartStore } from '@/lib/store';
import { sounds } from '@/lib/sound';

export const BentoMenu: React.FC = () => {
  const { addItem, setIsCartOpen } = useCartStore();

  const specialBox = menuItems.find(i => i.id === 'box-special')!;
  const royalTagine = menuItems.find(i => i.id === 'tagine-royal-mix')!;
  const chickenTagine = menuItems.find(i => i.id === 'tagine-chicken')!;
  const liverTagine = menuItems.find(i => i.id === 'tagine-liver')!;
  const riceMilk = menuItems.find(i => i.id === 'dessert-rice-milk')!;
  const crispyOnion = menuItems.find(i => i.id === 'extra-crispy-onion')!;
  const crunchyToast = menuItems.find(i => i.id === 'extra-toast')!;

  const handleQuickAdd = (item: any) => {
    sounds.playAddChime();
    addItem(item, 1);
  };

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-rose-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>تشكيلة الأكيلة الفاخرة</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
            أشهى أطباق الكشري وطواجن الفرن 👑
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 max-w-sm font-bold">
          كشري متبل بالخلطة الأصلية، طواجن فخار محمرة، ودقة وصلصة تفتح النفس.
        </p>
      </div>

      {/* Avant-Garde Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Bento Item 1: Wide Panoramic Royal Mix Tagine (Span 8 cols) */}
        <div className="md:col-span-8 group relative rounded-[2rem] overflow-hidden elevated-card-3d p-6 sm:p-8 flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs">
                <Flame className="w-3.5 h-3.5 fill-white" />
                طاجن الموسم الملوكي
              </span>
              
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                {royalTagine.name}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {royalTagine.description}
              </p>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-3xl font-black text-rose-600">
                  {royalTagine.price}
                </span>
                <span className="text-sm font-black text-amber-600">
                  جنيه مصري
                </span>
              </div>

              <button
                onClick={() => handleQuickAdd(royalTagine)}
                className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-md ruby-button-shadow transition active:scale-95 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>أضف للطلب فوراً</span>
              </button>
            </div>

            <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-rose-50/50 border border-rose-100 shadow-md">
              <Image
                src={royalTagine.imageUrl}
                alt={royalTagine.name}
                fill
                className="object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
            </div>

          </div>
        </div>

        {/* Bento Item 2: Tall Signature Pearl Box (Span 4 cols) */}
        <div className="md:col-span-4 group relative rounded-[2rem] overflow-hidden elevated-card-3d p-6 flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs">
                <Star className="w-3 h-3 fill-white" />
                توقيع اللؤلؤة
              </span>
              <span className="text-xl font-black text-rose-600">
                {specialBox.price} ج.م
              </span>
            </div>

            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-rose-100 shadow-xs">
              <Image
                src={specialBox.imageUrl}
                alt={specialBox.name}
                fill
                className="object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
            </div>

            <h3 className="text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors mb-1.5">
              {specialBox.name}
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
              {specialBox.description}
            </p>
          </div>

          <button
            onClick={() => handleQuickAdd(specialBox)}
            className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md ruby-button-shadow flex items-center justify-center gap-2 transition active:scale-95 mt-4"
          >
            <Plus className="w-4 h-4" />
            <span>أضف العلبة الخاصة</span>
          </button>

        </div>

        {/* Bento Item 3: Duo Tagines (Chicken & Liver) (Span 6 cols) */}
        <div className="md:col-span-6 grid grid-cols-2 gap-4">
          
          {/* Chicken Tagine */}
          <div className="group rounded-[1.75rem] elevated-card-3d p-4 flex flex-col justify-between">
            <div className="relative w-full h-28 rounded-xl overflow-hidden bg-rose-50 mb-2.5 border border-rose-100">
              <Image
                src={chickenTagine.imageUrl}
                alt={chickenTagine.name}
                fill
                className="object-cover transform group-hover:scale-105 transition duration-500"
              />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {chickenTagine.name}
              </h4>
              <span className="text-xs font-black text-rose-600 block mt-0.5">
                {chickenTagine.price} ج.م
              </span>
            </div>
            <button
              onClick={() => handleQuickAdd(chickenTagine)}
              className="w-full mt-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-black text-[11px] border border-rose-200 transition"
            >
              + إضافة
            </button>
          </div>

          {/* Liver Tagine */}
          <div className="group rounded-[1.75rem] elevated-card-3d p-4 flex flex-col justify-between">
            <div className="relative w-full h-28 rounded-xl overflow-hidden bg-rose-50 mb-2.5 border border-rose-100">
              <Image
                src={liverTagine.imageUrl}
                alt={liverTagine.name}
                fill
                className="object-cover transform group-hover:scale-105 transition duration-500"
              />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {liverTagine.name}
              </h4>
              <span className="text-xs font-black text-rose-600 block mt-0.5">
                {liverTagine.price} ج.م
              </span>
            </div>
            <button
              onClick={() => handleQuickAdd(liverTagine)}
              className="w-full mt-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-black text-[11px] border border-rose-200 transition"
            >
              + إضافة
            </button>
          </div>

        </div>

        {/* Bento Item 4: Crunchy Sides & Sweet Dessert (Span 6 cols) */}
        <div className="md:col-span-6 rounded-[2rem] elevated-card-3d p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              التحلية والمقرمشات الملكية
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            
            {/* Rice Milk */}
            <div className="text-center p-2 rounded-xl bg-white border border-rose-100 shadow-xs">
              <div className="relative w-14 h-14 mx-auto rounded-full overflow-hidden mb-1.5 border border-amber-200">
                <Image src={riceMilk.imageUrl} alt={riceMilk.name} fill className="object-cover" />
              </div>
              <div className="text-[11px] font-bold text-slate-900 truncate">{riceMilk.name}</div>
              <div className="text-[10px] font-black text-rose-600">{riceMilk.price} ج</div>
              <button
                onClick={() => handleQuickAdd(riceMilk)}
                className="w-full mt-1.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
              >
                + أضف
              </button>
            </div>

            {/* Crispy Toast */}
            <div className="text-center p-2 rounded-xl bg-white border border-rose-100 shadow-xs">
              <div className="relative w-14 h-14 mx-auto rounded-full overflow-hidden mb-1.5 border border-amber-200">
                <Image src={crunchyToast.imageUrl} alt={crunchyToast.name} fill className="object-cover" />
              </div>
              <div className="text-[11px] font-bold text-slate-900 truncate">{crunchyToast.name}</div>
              <div className="text-[10px] font-black text-rose-600">{crunchyToast.price} ج</div>
              <button
                onClick={() => handleQuickAdd(crunchyToast)}
                className="w-full mt-1.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
              >
                + أضف
              </button>
            </div>

            {/* Crispy Onion */}
            <div className="text-center p-2 rounded-xl bg-white border border-rose-100 shadow-xs">
              <div className="relative w-14 h-14 mx-auto rounded-full overflow-hidden mb-1.5 border border-amber-200">
                <Image src={crispyOnion.imageUrl} alt={crispyOnion.name} fill className="object-cover" />
              </div>
              <div className="text-[11px] font-bold text-slate-900 truncate">{crispyOnion.name}</div>
              <div className="text-[10px] font-black text-rose-600">{crispyOnion.price} ج</div>
              <button
                onClick={() => handleQuickAdd(crispyOnion)}
                className="w-full mt-1.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
              >
                + أضف
              </button>
            </div>

          </div>
        </div>

      </div>

    </section>
  );
};
