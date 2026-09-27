'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Check, 
  HelpCircle, 
  ShoppingBag, 
  Utensils, 
  Send,
  Lightbulb
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useCartStore } from '@/lib/store';
import { useMenuStore } from '@/lib/menuStore';

export interface TourStep {
  targetId: string;
  title: string;
  badge: string;
  description: string;
  hint?: string;
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
    badge: 'الخطوة 1 من 5',
    title: 'تصفح قائمة الطعام والمنيو 🍲',
    description: 'ابدأ بالضغط هنا للانتقال مباشرة إلى المنيو الكامل، وتصفح جميع العلب، الطواجن الفخار، والإضافات والمشروبات مع الأسعار.',
    hint: 'انقر على التالي أو اضغط على الزر للنزول للمنيو',
    preferredPosition: 'bottom',
    onEnter: () => {
      const el = document.getElementById('hero-menu-btn');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  },
  {
    targetId: 'tour-first-product-card',
    badge: 'الخطوة 2 من 5',
    title: 'اختيار وتخصيص وجبتك 🍽️',
    description: 'اضغط على زر (+) في أي طبق لإضافته للسلة فوراً، وبإمكانك اختيار المقاس وكتابة أي تعليمات خاصة للشيف (مثل صلصة برة أو تقلية زيادة).',
    hint: 'يمكنك أيضاً تصميم طاجنك الخاص بمكوناتك المفضلة',
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
    badge: 'الخطوة 3 من 5',
    title: 'سلة الطلبات ومراجعة الحساب 🛒',
    description: 'هنا تتجمع أكلاتك اللذيذة! اضغط على السلة في أي وقت لمعاينة محتويات طلبك، حساب الإجمالي، وتطبيق كوبونات الخصم.',
    hint: 'السلة تظهر لك إجمالي الحساب لحظياً',
    preferredPosition: 'bottom',
    onEnter: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  },
  {
    targetId: 'tour-customer-info-section',
    badge: 'الخطوة 4 من 5',
    title: 'تسجيل بياناتك (الاسم والموبايل والعنوان) ✍️',
    description: 'سجّل اسمك الكريم ورقم الموبايل، وحدد عنوانك بالتفصيل ومنطقة التوصيل. النظام يحفظ بياناتك تلقائياً لراحتك في كل مرة تطلب فيها!',
    hint: 'تُحفظ بياناتك بأمان على جهازك لسرعة طلبك القادم بدون إعادة كتابتها',
    preferredPosition: 'top',
    onEnter: () => {
      useCartStore.getState().setIsCartOpen(true);
      if (useCartStore.getState().items.length === 0) {
        const firstAvailable = useMenuStore.getState().items[0];
        if (firstAvailable) {
          useCartStore.getState().addItem(firstAvailable, 1);
        }
      }
      setTimeout(() => {
        const el = document.getElementById('tour-customer-info-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    },
  },
  {
    targetId: 'tour-cart-checkout-btn',
    badge: 'الخطوة 5 من 5 والأخيرة',
    title: 'إرسال وتأكيد الطلب عبر واتساب 🚀',
    description: 'اختر طريقة الدفع (كاش، فودافون كاش، إنستاباي)، واضغط هنا لتجهيز فاتورتك المنسقة وإرسالها فوراً للمطعم على واتساب للتجهيز الساخن!',
    hint: 'طلبك يذهب مباشرة لإدارة المطعم للتنفيذ الفوري',
    preferredPosition: 'top',
    onEnter: () => {
      useCartStore.getState().setIsCartOpen(true);
      setTimeout(() => {
        const el = document.getElementById('tour-cart-checkout-btn');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
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

  // Update target rectangle on resize/scroll/step change
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
    const el = document.getElementById(step.targetId);
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
  }, [isOpen, currentStepIndex]);

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
    window.addEventListener('scroll', updateTargetRect, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [isOpen, updateTargetRect]);

  // Handle step enter/leave
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep?.onEnter) {
      currentStep.onEnter();
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 350);

    return () => {
      clearTimeout(timer);
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

  // Calculate tooltip placement relative to targetRect
  const padding = 8;
  const tooltipWidth = Math.min(360, (windowSize.width || 360) - 32);

  let tooltipTop = 100;
  let tooltipLeft = ((windowSize.width || 360) - tooltipWidth) / 2;
  let arrowPlacement: 'top' | 'bottom' = 'top';

  if (targetRect) {
    const spaceBelow = (windowSize.height || 600) - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (currentStep.preferredPosition === 'bottom' || spaceBelow > 260) {
      tooltipTop = targetRect.bottom + 20;
      arrowPlacement = 'top'; // Arrow points UP towards target
    } else if (spaceAbove > 260) {
      tooltipTop = Math.max(20, targetRect.top - 250);
      arrowPlacement = 'bottom'; // Arrow points DOWN towards target
    } else {
      tooltipTop = Math.max(20, Math.min(targetRect.bottom + 16, (windowSize.height || 600) - 280));
    }

    // Keep tooltip horizontally aligned near target, clamped within screen
    const targetCenterX = targetRect.left + targetRect.width / 2;
    tooltipLeft = Math.max(16, Math.min(targetCenterX - tooltipWidth / 2, (windowSize.width || 360) - tooltipWidth - 16));
  }

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
            borderRadius: '24px',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78), 0 0 40px 10px rgba(245, 158, 11, 0.5)',
          }}
          className="fixed pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent animate-pulse"
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/78 backdrop-blur-xs transition-opacity duration-300" />
      )}

      {/* 2. Interactive Spotlight Click Blocker/Passer */}
      <div 
        className="fixed inset-0"
        onClick={(e) => {
          // If user clicked the dark overlay, proceed to next step
          if (e.target === e.currentTarget) {
            handleNext();
          }
        }}
      />

      {/* 3. Floating Animated Pointer Arrow */}
      {targetRect && (
        <div
          style={{
            left: `${Math.max(24, Math.min(targetRect.left + targetRect.width / 2 - 18, (windowSize.width || 360) - 48))}px`,
            top: arrowPlacement === 'top' 
              ? `${Math.max(10, targetRect.bottom + 2)}px`
              : `${Math.max(10, targetRect.top - 28)}px`,
          }}
          className={`fixed z-[100001] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            arrowPlacement === 'top' ? 'animate-bounce' : 'animate-bounce-short'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.8)] border-2 border-white font-black text-sm">
            {arrowPlacement === 'top' ? '⬆️' : '⬇️'}
          </div>
        </div>
      )}

      {/* 4. Luxury Floating Guidance Tooltip Card */}
      <div
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
        className="fixed z-[100000] rounded-3xl bg-white/98 backdrop-blur-2xl border-2 border-rose-300 ring-4 ring-amber-400/40 shadow-[0_25px_60px_-10px_rgba(225,29,72,0.28)] p-5 text-slate-900 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-scaleUp"
      >
        {/* Card Header with Step Counter and Close */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
            <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200/90 px-3 py-1 rounded-full shadow-2xs">
              {currentStep.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition border border-slate-200/80 cursor-pointer"
            title="تخطي الجولة"
            aria-label="تخطي الجولة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Content */}
        <div className="space-y-2 mb-4">
          <h3 className="text-base sm:text-lg font-black text-slate-950 leading-snug">
            {currentStep.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed">
            {currentStep.description}
          </p>

          {currentStep.hint && (
            <div className="p-2.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-[11px] text-amber-950 font-black flex items-center gap-2 mt-2.5 shadow-2xs">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{currentStep.hint}</span>
            </div>
          )}
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'w-7 bg-gradient-to-r from-red-600 to-amber-500'
                  : idx < currentStepIndex
                  ? 'w-2 bg-emerald-500'
                  : 'w-2 bg-slate-200'
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
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs sm:text-sm font-black shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            {currentStepIndex === TOUR_STEPS.length - 1 ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>فهمت ذلك! ابدأ الطلب 🚀</span>
              </>
            ) : (
              <>
                <span>الخطوة التالية</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
