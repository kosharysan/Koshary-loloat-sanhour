'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Flame,
  Star,
  Zap,
  Coins,
  DollarSign,
  Banknote,
  CircleDollarSign,
  BadgePercent,
  Wallet,
  Sparkles,
  Heart,
  Tag,
  Crown,
  Utensils,
  Award,
  Clock
} from 'lucide-react';
import { useMenuStore, defaultMarketingFilters } from '@/lib/menuStore';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const renderFilterIcon = (icon: string) => {
  if (!icon) return <span className="text-sm leading-none">🏷️</span>;
  if (icon === 'Star' || icon === 'popular') return <span className="text-sm leading-none">⭐</span>;
  if (icon === 'Flame' || icon === 'Pepper' || icon === 'spicy') return <span className="text-sm leading-none">🌶️</span>;
  if (icon === 'DollarSign' || icon === 'Coins' || icon === 'budget' || icon === 'Banknote') return <span className="text-sm leading-none">💰</span>;
  if (icon === 'Zap') return <span className="text-sm leading-none">⚡</span>;
  if (icon === 'Crown') return <span className="text-sm leading-none">👑</span>;
  if (icon === 'Sparkles') return <span className="text-sm leading-none">✨</span>;
  if (icon === 'Heart') return <span className="text-sm leading-none">❤️</span>;
  if (icon === 'Tag') return <span className="text-sm leading-none">🏷️</span>;
  if (icon === 'Utensils') return <span className="text-sm leading-none">🍽️</span>;
  if (icon === 'Award') return <span className="text-sm leading-none">🏆</span>;
  if (icon === 'Clock') return <span className="text-sm leading-none">⏰</span>;
  return <span className="text-sm leading-none select-none">{icon}</span>;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange
}) => {
  const [mounted, setMounted] = useState(false);
  const storeFilters = useMenuStore((s) => s.marketingFilters);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filters = mounted && storeFilters && storeFilters.length > 0 ? storeFilters : defaultMarketingFilters;
  const enabledFilters = filters.filter((f) => f.isEnabled);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 my-6 space-y-3">
      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute right-4 text-rose-600 pointer-events-none">
          <Search className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث عن طاجن، كشري، مقاس، أو إضافة..."
          className="w-full pr-12 pl-10 py-3.5 rounded-2xl bg-white border border-rose-200/80 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 transition shadow-xs"
        />

        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute left-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-rose-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Marketing Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
            activeFilter === 'all'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-rose-200/70 shadow-xs'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>الكل</span>
        </button>

        {enabledFilters.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(isActive ? 'all' : filter.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs scale-105'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-rose-200/70 shadow-xs'
              }`}
            >
              {renderFilterIcon(filter.icon)}
              <span>{filter.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

