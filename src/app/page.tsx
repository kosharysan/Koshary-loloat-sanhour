'use client';

import React, { useState, useMemo } from 'react';
import { FloatingNavbar } from '@/components/FloatingNavbar';
import { InteractiveHero } from '@/components/InteractiveHero';
import { KosharyHeritage } from '@/components/KosharyHeritage';
import { DishBuilder } from '@/components/DishBuilder';
import { CategoryNav } from '@/components/CategoryNav';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { ItemModal } from '@/components/ItemModal';
import { CartDrawer } from '@/components/CartDrawer';
import { FloatingCartButton } from '@/components/FloatingCartButton';
import { Footer } from '@/components/Footer';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { FlyAnimationProvider } from '@/context/FlyAnimationContext';
import { categories as fallbackCategories, menuItems as fallbackMenuItems } from '@/data/mockData';
import { useMenuStore } from '@/lib/menuStore';
import { MenuItem } from '@/types';
import { Sparkles, UtensilsCrossed, Utensils, Crown, Flame, Sandwich, PlusCircle } from 'lucide-react';

export default function Home() {
  const { items: storeItems, categories: storeCategories, dishBuilderSettings } = useMenuStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = mounted && storeItems ? storeItems : fallbackMenuItems;
  const categories = mounted && storeCategories ? storeCategories : fallbackCategories;

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isDishBuilderOpen, setIsDishBuilderOpen] = useState<boolean>(false);

  // Reset activeCategory to 'all' if the selected category was deleted
  React.useEffect(() => {
    if (activeCategory !== 'all' && mounted && categories.length > 0) {
      if (!categories.some(c => c.id === activeCategory)) {
        setActiveCategory('all');
      }
    }
  }, [activeCategory, categories, mounted]);

  const handleNavigateToMenu = () => {
    const el = document.getElementById('full-menu');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleDishBuilder = () => {
    if (!isDishBuilderOpen) {
      setIsDishBuilderOpen(true);
      setTimeout(() => {
        const el = document.getElementById('dish-builder');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    } else {
      setIsDishBuilderOpen(false);
    }
  };

  // Filtered menu items based on category, search, and chips
  const filteredItems = useMemo(() => {
    // Only accept items that belong to currently active/existing categories
    const validCategoryIds = new Set(categories.map((c) => c.id));

    return menuItems.filter((item) => {
      // Must belong to an active, non-deleted category
      if (!validCategoryIds.has(item.categoryId)) {
        return false;
      }

      // Category filter
      if (activeCategory !== 'all' && item.categoryId !== activeCategory) {
        return false;
      }

      // Quick filter chips (Marketing Sub-filters)
      if (activeFilter !== 'all') {
        if (activeFilter === 'popular' && !item.isPopular && !item.tags?.includes('popular')) return false;
        else if (activeFilter === 'spicy' && !item.isSpicy && !item.tags?.includes('spicy')) return false;
        else if (activeFilter === 'budget' && item.price >= 35 && !item.tags?.includes('budget')) return false;
        else if (activeFilter !== 'popular' && activeFilter !== 'spicy' && activeFilter !== 'budget') {
          if (!item.tags?.includes(activeFilter)) return false;
        }
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesTags = item.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [menuItems, categories, activeCategory, searchQuery, activeFilter]);

  return (
    <FlyAnimationProvider>
      <main className="relative min-h-screen text-slate-900 selection:bg-rose-600 selection:text-white pb-20 overflow-x-hidden">
      
      {/* Dynamic Animated Luxury Motion Background directly visible on top of body layer */}
      <AnimatedBackground />

      <div className="relative z-10">
        {/* 1. Floating Capsule Navbar */}
        <FloatingNavbar />

        {/* 2. Interactive 3D Dish Hero Spotlight with Navigation Buttons */}
        <InteractiveHero
          onNavigateToMenu={handleNavigateToMenu}
          onToggleDishBuilder={handleToggleDishBuilder}
          isDishBuilderOpen={isDishBuilderOpen}
        />

        {/* 3. Interactive Dish Builder Studio ("صمّم طاجنك الملوكي") يفتح ويقفل عند الضغط على الزر */}
        {dishBuilderSettings?.isEnabled && (
          <DishBuilder
            isOpen={isDishBuilderOpen}
            onClose={() => setIsDishBuilderOpen(false)}
          />
        )}

      {/* 5. Complete Categorized Menu Section */}
      <section className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t-2 border-rose-200/70" id="full-menu">
        
        {/* Section Heading */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
            <Utensils className="w-3.5 h-3.5 text-rose-600" />
            <span>المنيو الكامل لجميع الأصناف</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
            قائمة الطعام والطلبات الفورية
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            تصفح جميع العلب والطواجن والميكسات والإضافات مع التوصيل الفوري.
          </p>
        </div>

        {/* Sticky Horizontal Categories Bar */}
        <CategoryNav
          activeCategory={activeCategory}
          onSelectCategory={(id) => setActiveCategory(id)}
        />

        {/* Instant Search & Quick Filters */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Category Result Count Header */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-rose-200/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-base font-black text-slate-900">
              {activeCategory === 'all'
                ? (searchQuery.trim() || activeFilter !== 'all' ? 'نتائج البحث والفلترة' : 'جميع الأصناف المتاحة')
                : categories.find(c => c.id === activeCategory)?.name || 'الأصناف'}
            </span>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            {filteredItems.length} صنف
          </span>
        </div>

        {/* Empty Search Results */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-white/90 backdrop-blur-md rounded-3xl border border-rose-200 shadow-sm p-8 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">لا توجد أصناف مطابقة لبحثك</h3>
              <p className="text-xs text-slate-500">
                جرب البحث بكلمات أخرى أو اختر فئة مختلفة من الشريط العلوي.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
                setActiveFilter('all');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition shadow-xs"
            >
              عرض كل الأصناف
            </button>
          </div>
        ) : activeCategory === 'all' && !searchQuery.trim() && activeFilter === 'all' ? (
          /* في حالة اختيار "الكل" وبدون بحث: عرض كل قسم وبينه فاصل أنيق وشيك جداً */
          <div className="space-y-12 sm:space-y-16">
            {[...categories]
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((category, index) => {
                const categoryItems = filteredItems.filter((item) => item.categoryId === category.id);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-5">
                    {/* الفاصل الشيك وتصميم عنوان القسم */}
                    <div className="relative flex items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 text-sm">
                          {category.icon === 'Crown' ? <Crown className="w-4 h-4" /> :
                           category.icon === 'Flame' ? <Flame className="w-4 h-4" /> :
                           category.icon === 'Sandwich' ? <Sandwich className="w-4 h-4" /> :
                           category.icon === 'PlusCircle' ? <PlusCircle className="w-4 h-4" /> :
                           category.icon === 'Sparkles' ? <Sparkles className="w-4 h-4" /> :
                           <Utensils className="w-4 h-4" />}
                        </span>
                        <div>
                          <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span>{category.name}</span>
                            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/80">
                              {categoryItems.length}
                            </span>
                          </h3>
                          {category.description && (
                            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* الخط الفاصل الزخرفي الفاخر بتصميم متدرج */}
                      <div className="flex-1 h-[2px] bg-gradient-to-l from-rose-300/80 via-amber-300/60 to-transparent mx-2 hidden sm:block rounded-full"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategory(category.id);
                          const el = document.getElementById('full-menu');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="text-[11px] sm:text-xs font-black text-rose-700 hover:text-red-700 hover:bg-rose-100/60 px-2.5 py-1 rounded-xl transition shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <span>عرض القسم فقط</span>
                        <span className="text-xs">←</span>
                      </button>
                    </div>

                    {/* شبكة أصناف هذا القسم */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                      {[...categoryItems]
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                        .map((item) => (
                        <ProductCard
                          key={item.id}
                          item={item}
                          onOpenCustomizer={(itemToCustomize) => setCustomizingItem(itemToCustomize)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          /* في حالة اختيار قسم معين أو عند إجراء بحث / فلترة: عرض شبكة الأصناف المباشرة */
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[...filteredItems]
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpenCustomizer={(itemToCustomize) => setCustomizingItem(itemToCustomize)}
              />
            ))}
          </div>
        )}

      </section>

      {/* 6. Authentic Koshary Heritage & Secrets Showcase (بعد المنيو) */}
      <KosharyHeritage />

      {/* 7. Item Customization Modal */}
      <ItemModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* 7. Slide-over Luxury Cart Drawer */}
      <CartDrawer />

      {/* 8. Floating Quick Cart Button */}
      <FloatingCartButton />

      {/* 9. Luxury Footer */}
      <Footer />

      </div>
      </main>
    </FlyAnimationProvider>
  );
}
