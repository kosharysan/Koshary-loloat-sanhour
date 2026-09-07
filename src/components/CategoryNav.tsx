'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Flame,
  Sparkles,
  Sandwich,
  PlusCircle,
  Coffee,
  Utensils,
  Star,
  Heart,
  Pizza,
  Package,
  Salad,
  Tag
} from 'lucide-react';
import { categories as defaultCategories, menuItems as defaultMenuItems } from '@/data/mockData';
import { useMenuStore } from '@/lib/menuStore';

interface CategoryNavProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Crown: <Crown className="w-4 h-4" />,
  Flame: <Flame className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Sandwich: <Sandwich className="w-4 h-4" />,
  PlusCircle: <PlusCircle className="w-4 h-4" />,
  Coffee: <Coffee className="w-4 h-4" />,
  Utensils: <Utensils className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Pizza: <Pizza className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Salad: <Salad className="w-4 h-4" />,
  Tag: <Tag className="w-4 h-4" />
};

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeCategory,
  onSelectCategory
}) => {
  const [mounted, setMounted] = useState(false);
  const storeCategories = useMenuStore((s) => s.categories);
  const storeItems = useMenuStore((s) => s.items);

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories = mounted && storeCategories && storeCategories.length > 0 ? storeCategories : defaultCategories;
  const sortedCategories = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const items = mounted && storeItems && storeItems.length > 0 ? storeItems : defaultMenuItems;
  const availableItems = items.filter(i => i.isAvailable !== false);

  return (
    <div className="sticky top-[69px] z-30 w-full py-3 luxury-glass-nav">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
          
          {/* 'All' button */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-md ruby-button-shadow scale-105'
                : 'bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 border border-rose-200/80 shadow-xs'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeCategory === 'all' ? 'text-amber-300' : 'text-amber-500'}`} />
            <span>كل الأصناف</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-800 border border-rose-100'
            }`}>
              {availableItems.length}
            </span>
          </button>

          {/* Categories */}
          {sortedCategories.map((cat) => {
            const count = availableItems.filter(i => i.categoryId === cat.id).length;
            const isActive = activeCategory === cat.id;
            const iconComponent = (cat.icon && iconMap[cat.icon]) || <Utensils className="w-4 h-4" />;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-md ruby-button-shadow scale-105'
                    : 'bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50/60 border border-rose-200/80 shadow-xs'
                }`}
              >
                <span className={isActive ? 'text-amber-300' : 'text-rose-600'}>
                  {iconComponent}
                </span>
                <span>{cat.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
};

