'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Check
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useCartStore } from '@/lib/store';
import { useMenuStore } from '@/lib/menuStore';

export interface TourStep {
  targetId: string;
  title: string;
  badge: string;
  description: string;
  preferredPosition?: 'bottom' | 'top' | 'auto';
  onEnter?: () => void;
  onLeave?: () => void;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'hero-menu-btn',
    badge: '1/5',
    title: 'قائمة الطعام 🍲',
    description: 'تصفح كل الأصناف والأسعار',
    preferredPosition: 'bottom',
    onEnter: () => {
      const el = document.getElementById('hero-menu-btn') || 
                 document.getElementById('category-nav-bar') || 
                 document.getElementById('full-menu');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  },
  {
    targetId: 'tour-first-product-card',
    badge: '2/5',
    title: 'اختر وجبتك 🍽️',
    description: 'اضغط (+) لإضافة الطبق للسلة',
    preferredPosition: 'top',
    onEnter: () => {
      const el = document.getElementById('tour-first-product-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  },
  {
    targetId: 'floating-navbar-cart-btn',
    badge: '3/5',
    title: 'سلة الطلبات 🛒',
    description: 'اضغط لمعاينة طلبك وحساب الإجمالي',
    preferredPosition: 'bottom',
    onEnter: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  },
  {
    targetId: 'tour-customer-info-section',
    badge: '4/5',
    title: 'بيانات التوصيل ✍️',
    description: 'اكتب اسمك ورقمك وعنوانك',
    preferredPosition: 'bottom',
    onEnter: () => {
      useCartStore.getState().setIsCartOpen(true);
      if (useCartStore.getState().items.length === 0) {
        const firstAvailable = useMenuStore.getState().items[0];
        if (firstAvailable) {
          useCartStore.getState().addItem(firstAvailable, 1);
        }
      }
      setTimeout(() => {
        const scrollContainer = document.getElementById('cart-drawer-scroll-container');
        const el = document.getElementById('tour-customer-info-section');
        if (scrollContainer && el) {
          scrollContainer.scrollTo({ top: Math.max(0, el.offsetTop - 30), behavior: 'smooth' });
        }
      }, 60);
    },
  },
  {
    targetId: 'tour-cart-checkout-btn',
    badge: '5/5',
    title: 'إرسال الطلب 🚀',
    description: 'أكّد طلبك عبر واتساب فوراً',
    preferredPosition: 'top',
    onEnter: () => {
      useCartStore.getState().setIsCartOpen(true);
      setTimeout(() => {
        const scrollContainer = document.getElementById('cart-drawer-scroll-container');
        const el = document.getElementById('tour-cart-checkout-btn');
        if (scrollContainer && el) {
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
        }
      }, 60);
    },
    onLeave: () => {
      useCartStore.getState().setIsCartOpen(false);
    },
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const currentStep = TOUR_STEPS[currentStepIndex];

  // 1. Lock background page scroll while tour is active
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
      };
    }
  }, [isOpen]);

  // 2. Resolve target element safely with fallback for hidden buttons
  const getTargetElement = useCallback((targetId: string) => {
    let el = document.getElementById(targetId);
    if (!el && targetId === 'hero-menu-btn') {
      el = document.getElementById('category-nav-bar') || document.getElementById('full-menu');
    }
    return el;
  }, []);

  // 3. Update target bounding rectangle
  const updateTargetRect = useCallback(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }
    const step = TOUR_STEPS[currentStepIndex];
    if (!step) {
      setTargetRect(null);
      return;
    }
    const el = getTargetElement(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(prev => {
        if (
          prev &&
          Math.round(prev.top) === Math.round(rect.top) &&
          Math.round(prev.left) === Math.round(rect.left) &&
          Math.round(prev.width) === Math.round(rect.width) &&
          Math.round(prev.height) === Math.round(rect.height)
        ) {
          return prev;
        }
        return rect;
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStepIndex, getTargetElement]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setWindowSize(prev => {
        if (prev.width === window.innerWidth && prev.height === window.innerHeight) {
          return prev;
        }
        return { width: window.innerWidth, height: window.innerHeight };
      });
      updateTargetRect();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateTargetRect]);

  // 4. Handle step transitions with rapid zero-lag re-measurement
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep?.onEnter) {
      currentStep.onEnter();
    }

    // Fast initial check then quick settle check
    const timer1 = setTimeout(() => updateTargetRect(), 80);
    const timer2 = setTimeout(() => updateTargetRect(), 220);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (currentStep?.onLeave) {
        currentStep.onLeave();
      }
    };
  }, [isOpen, currentStepIndex, currentStep, updateTargetRect]);

  const handleNext = () => {
    sounds.playAddChime();
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    sounds.playRemoveChime();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    sounds.playAddChime();
    if (typeof window !== 'undefined') {
      localStorage.setItem('lolat_tour_completed_v1', 'true');
    }
    onComplete?.();
    onClose();
    setCurrentStepIndex(0);
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lolat_tour_completed_v1', 'true');
    }
    onClose();
    setCurrentStepIndex(0);
  };

  if (!isOpen) return null;

  // 5. Smart Viewport Clamping & Concise Card Placement
  const screenWidth = windowSize.width || (typeof window !== 'undefined' ? window.innerWidth : 360);
  const screenHeight = windowSize.height || (typeof window !== 'undefined' ? window.innerHeight : 600);
  const tooltipWidth = Math.min(310, screenWidth - 24);
  const estimatedHeight = 135;

  let tooltipTop = 100;
  let tooltipLeft = (screenWidth - tooltipWidth) / 2;
  let arrowPlacement: 'top' | 'bottom' = 'top';

  if (targetRect) {
    const spaceAbove = targetRect.top;
    const spaceBelow = screenHeight - targetRect.bottom;

    // Determine whether to place tooltip above or below target
    if (currentStep.preferredPosition === 'bottom' && spaceBelow >= estimatedHeight + 20) {
      tooltipTop = targetRect.bottom + 14;
      arrowPlacement = 'top'; // Arrow points UP towards target
    } else if (currentStep.preferredPosition === 'top' && spaceAbove >= estimatedHeight + 20) {
      tooltipTop = targetRect.top - estimatedHeight - 14;
      arrowPlacement = 'bottom'; // Arrow points DOWN towards target
    } else if (spaceBelow >= estimatedHeight + 20) {
      tooltipTop = targetRect.bottom + 14;
      arrowPlacement = 'top';
    } else if (spaceAbove >= estimatedHeight + 20) {
      tooltipTop = targetRect.top - estimatedHeight - 14;
      arrowPlacement = 'bottom';
    } else {
      // If tight, place where there is more room and strictly clamp inside screen
      tooltipTop = spaceBelow > spaceAbove 
        ? targetRect.bottom + 10 
        : targetRect.top - estimatedHeight - 10;
      arrowPlacement = spaceBelow > spaceAbove ? 'top' : 'bottom';
    }

    // STRICT CLAMP: Tooltip will NEVER overflow top or bottom edges of viewport
    tooltipTop = Math.max(12, Math.min(tooltipTop, screenHeight - estimatedHeight - 12));

    // Align horizontally with target center, clamped within screen margins
    const targetCenterX = targetRect.left + targetRect.width / 2;
    tooltipLeft = Math.max(12, Math.min(targetCenterX - tooltipWidth / 2, screenWidth - tooltipWidth - 12));
  }

  const padding = 6;

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-auto select-none transition-all duration-300">
      
      {/* 1. Backdrop Spotlight Frame using High-Resolution Multi-Layer Box Shadow */}
      {targetRect ? (
        <div
          style={{
            top: `${Math.max(0, targetRect.top - padding)}px`,
            left: `${Math.max(0, targetRect.left - padding)}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
            borderRadius: '20px',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.82), 0 0 35px 8px rgba(245, 158, 11, 0.55)',
          }}
          className="fixed pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ring-3 ring-amber-400 ring-offset-2 ring-offset-transparent animate-pulse"
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-300" />
      )}

      {/* 2. Interactive Spotlight Click Blocker/Passer */}
      <div 
        className="fixed inset-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleNext();
          }
        }}
      />

      {/* 3. Luxury Custom SVG Glowing Arrow Pointer */}
      {targetRect && (
        <div
          style={{
            left: `${Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 16, screenWidth - 44))}px`,
            top: arrowPlacement === 'top' 
              ? `${Math.max(6, targetRect.bottom + 2)}px`
              : `${Math.max(6, targetRect.top - 36)}px`,
          }}
          className={`fixed z-[100001] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            arrowPlacement === 'top' ? 'animate-bounce' : 'animate-bounce-short'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.9)] border-2 border-white">
            <svg 
              className="w-4 h-4 fill-none stroke-slate-950" 
              viewBox="0 0 24 24" 
              strokeWidth="3.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {arrowPlacement === 'top' ? (
                <path d="M12 19V5M5 12l7-7 7 7" />
              ) : (
                <path d="M12 5v14M19 12l-7 7-7-7" />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* 4. Luxury Concise Guidance Card (مختصر مفيد بدون حشو) */}
      <div
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
        className="fixed z-[100000] rounded-2xl bg-white/98 backdrop-blur-2xl border border-rose-200 ring-4 ring-amber-400/40 shadow-[0_20px_45px_-10px_rgba(225,29,72,0.3)] p-3.5 sm:p-4 text-slate-900 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-scaleUp"
      >
        {/* Card Header with Step Counter and Close */}
        <div className="flex items-center justify-between pb-2 border-b border-rose-100 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
            <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shadow-2xs">
              {currentStep.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition border border-slate-200/80 cursor-pointer"
            title="تخطي الجولة"
            aria-label="تخطي الجولة"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Content - مختصر مفيد كلمتين ثلاثة */}
        <div className="space-y-0.5 mb-3">
          <h3 className="text-sm sm:text-base font-black text-slate-950 leading-tight">
            {currentStep.title}
          </h3>
          <p className="text-xs font-bold text-slate-600 leading-snug">
            {currentStep.description}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-1 mb-2.5">
          {TOUR_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'w-5 bg-gradient-to-r from-red-600 to-amber-500'
                  : idx < currentStepIndex
                  ? 'w-1.5 bg-emerald-500'
                  : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Card Actions Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-rose-100">
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200 shrink-0"
            >
              <ArrowRight className="w-3 h-3" />
              <span>السابق</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs font-black shadow-md shadow-rose-600/25 transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            {currentStepIndex === TOUR_STEPS.length - 1 ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>ابدأ الطلب 🚀</span>
              </>
            ) : (
              <>
                <span>التالي</span>
                <ArrowLeft className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
