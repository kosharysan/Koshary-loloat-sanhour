'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Plus, Minus, Flame, Star, Sparkles, SlidersHorizontal } from 'lucide-react';
import { MenuItem } from '@/types';
import { useCartStore } from '@/lib/store';
import { sounds } from '@/lib/sound';
import { useFlyToCart } from '@/context/FlyAnimationContext';

interface ProductCardProps {
  item: MenuItem;
  onOpenCustomizer: (item: MenuItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onOpenCustomizer
}) => {
  const { items, addItem, updateQuantity } = useCartStore();
  const { flyToCart, returnFromCart } = useFlyToCart();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Check if item is already in cart
  const cartItemsForThis = items.filter(i => i.menuItemId === item.id);
  const totalQuantityInCart = cartItemsForThis.reduce((sum, i) => sum + i.quantity, 0);

  const hasSizes = Boolean(item.sizes && item.sizes.length > 0);

  const handleAddClick = () => {
    sounds.playAddChime();
    if (imageContainerRef.current) {
      flyToCart(imageContainerRef.current, item.imageUrl);
    }
    if (hasSizes) {
      onOpenCustomizer(item);
    } else {
      addItem(item, 1);
    }
  };

  const handleIncrement = () => {
    sounds.playAddChime();
    if (imageContainerRef.current) {
      flyToCart(imageContainerRef.current, item.imageUrl);
    }
    updateQuantity(cartItemsForThis[0].id, 1);
  };

  const handleDecrement = () => {
    sounds.playRemoveChime();
    if (imageContainerRef.current) {
      returnFromCart(imageContainerRef.current, item.imageUrl);
    }
    updateQuantity(cartItemsForThis[0].id, -1);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click was directly on a button (like minus/plus), let the button handle it
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (hasSizes) {
      handleAddClick();
    } else if (totalQuantityInCart > 0) {
      handleIncrement();
    } else {
      handleAddClick();
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (hasSizes) handleAddClick();
          else if (totalQuantityInCart > 0) handleIncrement();
          else handleAddClick();
        }
      }}
      className="group relative rounded-2xl sm:rounded-[2rem] elevated-card-3d p-3 sm:p-5 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 select-none"
    >
      
      {/* Top Media / Image Container */}
      <div 
        ref={imageContainerRef}
        className="relative w-full h-36 sm:h-52 rounded-xl sm:rounded-2xl overflow-hidden bg-rose-50/40 mb-2.5 sm:mb-3.5 border border-rose-100/90 shadow-inner group-hover:border-rose-300 transition-colors"
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          unoptimized={item.imageUrl.startsWith('data:')}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transform group-hover:scale-110 group-hover:rotate-1 transition-all duration-700 ease-out will-change-transform"
        />

        {/* Dynamic light shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Subtle shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none"></div>

        {/* Top Badges */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1 z-10">
          {item.isPopular && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-black bg-amber-500 text-white shadow-sm backdrop-blur-xs">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
              <span>الأكثر طلباً</span>
            </span>
          )}

          {item.isSpicy && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-black bg-rose-600 text-white shadow-sm backdrop-blur-xs">
              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
              <span>حار نار</span>
            </span>
          )}

          {item.tags?.includes('توقيع المحل') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-black bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm backdrop-blur-xs">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>توقيع اللؤلؤة</span>
            </span>
          )}
        </div>

        {/* Discount badge */}
        {item.originalPrice && item.originalPrice > item.price && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-black bg-emerald-600 text-white shadow-sm">
            خصم {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
          </div>
        )}

        {/* Bottom price tag inside image */}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-baseline gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl border border-white/20 shadow-md">
          <span className="text-base sm:text-xl font-black text-white">
            {item.price}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-amber-300">
            ج.م
          </span>
          {item.originalPrice && (
            <span className="text-[10px] sm:text-xs line-through text-gray-300 mr-0.5">
              {item.originalPrice} ج.م
            </span>
          )}
        </div>

      </div>

      {/* Middle Text Details */}
      <div className="space-y-1 flex-1 mb-2.5 sm:mb-4">
        <h3 className="text-sm sm:text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-1 sm:line-clamp-none">
          {item.name}
        </h3>
        <p className="text-[11px] sm:text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">
          {item.description}
        </p>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-rose-100/60">
        
        {/* Customization prompt if sizes exist */}
        {hasSizes ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddClick();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-[11px] sm:text-sm shadow-md ruby-button-shadow transition active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">اختر المقاس والملاحظات</span>
            <span className="sm:hidden">تخصيص والمقاس</span>
            {totalQuantityInCart > 0 && (
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-rose-700 text-[10px] sm:text-xs font-black flex items-center justify-center shadow-xs shrink-0">
                {totalQuantityInCart}
              </span>
            )}
          </button>
        ) : totalQuantityInCart > 0 ? (
          <div className="w-full flex items-center justify-between bg-rose-50/60 border border-rose-200 rounded-xl sm:rounded-2xl p-1 sm:p-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDecrement();
              }}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-slate-700 transition active:scale-90 shadow-xs cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-base font-black text-slate-900 px-1 sm:px-3">
              {totalQuantityInCart}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleIncrement();
              }}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white transition active:scale-90 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddClick();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-[11px] sm:text-sm shadow-md ruby-button-shadow transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>أضف للطلب</span>
          </button>
        )}

      </div>

    </div>
  );
};
