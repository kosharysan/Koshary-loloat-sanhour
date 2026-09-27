'use client';

import React from 'react';
import { MenuItem } from '@/types';
import { useMenuStore } from '@/lib/menuStore';
import { getStorefrontPricing } from '@/lib/itemDiscount';

interface PriceDisplayProps {
  item: MenuItem;
  selectedSize?: string;
  variant?: 'light' | 'dark' | 'plain';
  className?: string;
}

export function SlashedCatalog({
  value,
  suffix,
  tone = 'onDark',
  slash = 'inherit',
  className = '',
}: {
  value: number;
  suffix?: string;
  tone?: 'onDark' | 'onLight';
  slash?: 'inherit' | 'rose';
  className?: string;
}) {
  const color = tone === 'onDark' ? 'text-white/90' : 'text-slate-500';
  return (
    <span
      className={`slash-out-price px-[1px] text-[11px] sm:text-xs font-semibold tracking-wide ${
        slash === 'rose' ? 'slash-out-price-rose' : ''
      } ${color} ${className}`}
    >
      {value}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  item,
  selectedSize,
  variant = 'light',
  className = '',
}) => {
  const categories = useMenuStore((state) => state.categories);
  const globalMenuDiscount = useMenuStore((state) => state.globalMenuDiscount);
  const pricing = getStorefrontPricing(item, categories, globalMenuDiscount, selectedSize);

  if (variant === 'dark') {
    return (
      <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
        <span className="font-black text-white">{pricing.sale}</span>
        <span className="text-amber-300 font-bold">ج.م</span>
        {pricing.hasDiscount && (
          <SlashedCatalog value={pricing.catalog} suffix="ج.م" />
        )}
      </span>
    );
  }

  if (variant === 'plain') {
    return (
      <span className={`inline-flex items-baseline gap-1 ${className}`}>
        <span className="font-black text-rose-700">{pricing.sale} ج.م</span>
        {pricing.hasDiscount && (
          <SlashedCatalog value={pricing.catalog} suffix="ج.م" tone="onLight" />
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${className}`}>
      {pricing.hasDiscount && <SlashedCatalog value={pricing.catalog} slash="rose" />}
      <span className="text-lg sm:text-xl leading-none font-black text-white">
        {pricing.sale}
      </span>
      <span className="text-amber-300 font-bold">ج.م</span>
    </span>
  );
};

export function useStorefrontPricing(item: MenuItem | null | undefined, selectedSize?: string) {
  const categories = useMenuStore((state) => state.categories);
  const globalMenuDiscount = useMenuStore((state) => state.globalMenuDiscount);
  if (!item) {
    return { catalog: 0, sale: 0, hasDiscount: false, discount: null, source: null };
  }
  return getStorefrontPricing(item, categories, globalMenuDiscount, selectedSize);
}
