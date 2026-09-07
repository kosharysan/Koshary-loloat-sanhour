'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Check, Plus, ShoppingBag, Wand2, ArrowLeft, Edit3, X, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useMenuStore, defaultDishBuilderSettings, defaultKosharyCustomOptions } from '@/lib/menuStore';
import { DishBuilderOption } from '@/types';
import { sounds } from '@/lib/sound';
import confetti from 'canvas-confetti';

interface DishBuilderProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DishBuilder: React.FC<DishBuilderProps> = ({
  isOpen = false,
  onClose
}) => {
  const { addItem, setIsCartOpen } = useCartStore();
  const { dishBuilderSettings } = useMenuStore();

  const bases = dishBuilderSettings?.bases && dishBuilderSettings.bases.length > 0
    ? dishBuilderSettings.bases
    : defaultDishBuilderSettings.bases;

  const meats = dishBuilderSettings?.proteins && dishBuilderSettings.proteins.length > 0
    ? dishBuilderSettings.proteins
    : defaultDishBuilderSettings.proteins;

  const toppings = dishBuilderSettings?.toppings && dishBuilderSettings.toppings.length > 0
    ? dishBuilderSettings.toppings
    : defaultDishBuilderSettings.toppings;

  // Builder state
  const [base, setBase] = useState<DishBuilderOption>(() => bases[0]);
  const [meat, setMeat] = useState<{ id?: string; name: string; price: number }>(() => meats[0]);

  useEffect(() => {
    const currentBase = bases.find(b => b.id === base.id || b.name === base.name);
    if (currentBase) {
      setBase(currentBase);
    } else if (bases[0]) {
      setBase(bases[0]);
    }
  }, [bases, base.id, base.name]);

  useEffect(() => {
    if (!meats.some(m => m.name === meat.name)) {
      if (meats[0]) setMeat(meats[0]);
    }
  }, [meats, meat.name]);

  const [spice, setSpice] = useState<string>('مشطشط وسط');
  
  const [selectedToppings, setSelectedToppings] = useState<
    { id?: string; name: string; price: number }[]
  >(() => toppings.slice(0, 2));

  // Koshary / Base "بدون" (No Options) state
  const [builderSelectedNoOptions, setBuilderSelectedNoOptions] = useState<string[]>([]);
  const [selectedNoPreset, setSelectedNoPreset] = useState<string>('');

  // General custom notes state (إمكانية كتابة وإضافة أكثر من ملاحظة)
  const [builderCustomNotes, setBuilderCustomNotes] = useState<string[]>([]);
  const [customNoteInput, setCustomNoteInput] = useState<string>('');

  // Reset selected no-options when base changes if new base has different options or hasNoOptions disabled
  useEffect(() => {
    if (!base.hasNoOptions) {
      setBuilderSelectedNoOptions([]);
    } else if (base.noOptions && base.noOptions.length > 0) {
      // Retain only options valid for the new base
      setBuilderSelectedNoOptions(prev => prev.filter(opt => base.noOptions!.includes(opt)));
    }
  }, [base.id, base.hasNoOptions]);

  const spices = [
    { name: 'بارد بدون شطة', icon: '❄️' },
    { name: 'مشطشط وسط', icon: '🌶️' },
    { name: 'حار نار جهنم', icon: '🔥' }
  ];

  const toggleTopping = (topping: { name: string; price: number }) => {
    sounds.playAddChime();
    if (selectedToppings.some(t => t.name === topping.name)) {
      setSelectedToppings(selectedToppings.filter(t => t.name !== topping.name));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const toppingsTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const total = base.price + meat.price + toppingsTotal;

  const handleAddCustomDish = () => {
    sounds.playSuccessChime();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#e11d48', '#f59e0b', '#ffffff']
    });

    // Merge any pending note text from input field that hasn't been explicitly added via button
    const pendingNote = customNoteInput.trim();
    const finalCustomNotes = [...builderCustomNotes];
    if (pendingNote && !finalCustomNotes.includes(pendingNote)) {
      finalCustomNotes.push(pendingNote);
      setBuilderCustomNotes(finalCustomNotes);
      setCustomNoteInput('');
    }

    const summaryParts = [
      `الأساس: ${base.name}`,
      `البروتين: ${meat.name}`,
      `درجة الشطة: ${spice}`,
      `الإضافات: ${selectedToppings.map(t => t.name).join('، ') || 'بدون'}`
    ];

    if (builderSelectedNoOptions.length > 0) {
      summaryParts.push(`بدون: ${builderSelectedNoOptions.join('، ')}`);
    }

    if (finalCustomNotes.length > 0) {
      summaryParts.push(`ملاحظات: ${finalCustomNotes.join('، ')}`);
    }

    const notesSummary = summaryParts.join(' | ');

    // Compile distinct notes items for the cart drawer
    const allCartNotes: string[] = [
      ...builderSelectedNoOptions,
      ...finalCustomNotes
    ];

    const customDetails = {
      base: base.name,
      meat: meat.name,
      spice: spice,
      toppings: selectedToppings.map(t => t.name),
      noOptions: builderSelectedNoOptions.length > 0 ? [...builderSelectedNoOptions] : undefined,
      customNotes: finalCustomNotes.length > 0 ? [...finalCustomNotes] : undefined
    };

    addItem(
      {
        id: `custom-dish-${Date.now()}`,
        categoryId: 'casseroles',
        name: `طاجن مبتكر خاص (${meat.name})`,
        description: notesSummary,
        price: total,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
        isAvailable: true
      },
      1,
      undefined,
      notesSummary,
      allCartNotes,
      customDetails
    );

    setIsCartOpen(true);
  };

  if (!isOpen || !dishBuilderSettings?.isEnabled) {
    return null;
  }

  return (
    <section className="py-8 px-4 max-w-6xl mx-auto transition-all duration-500 animate-in fade-in zoom-in-95" id="dish-builder">
      
      {/* Outer Card with 3D Elevation (without overflow-hidden to preserve layout and sticky) */}
      <div className="relative rounded-[2.5rem] elevated-stage-3d p-6 sm:p-10 border border-rose-200/90 shadow-2xl">
        
        {/* Top Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-rose-200/70">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black mb-2">
              <Wand2 className="w-4 h-4 text-rose-600" />
              <span>ابتكار حصري في لؤلؤة سنهور</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
              صمّم طاجنك الملوكي على كيفك 👨‍🍳
            </h2>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm font-medium">
              اختر المكونات التي تعشقها وسيقوم الشيف بتسويتها طازجة في الفرن لك فوراً!
            </p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-rose-100/80 hover:bg-rose-200 text-rose-800 text-xs font-black transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                title="إغلاق كارت التصميم"
              >
                <span>إغلاق ✕</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Grid: Side-by-Side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls: Steps 1 to 4 (Span 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Base */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">1</span>
                <span>اختر الأساس:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {bases.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => {
                      sounds.playAddChime();
                      setBase(b);
                    }}
                    className={`p-3.5 rounded-2xl border text-right text-xs font-bold transition flex flex-col justify-between gap-2 shadow-xs ${
                      base.name === b.name
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-102 ring-2 ring-rose-300'
                        : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50/40'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className={`text-xs font-black ${base.name === b.name ? 'text-amber-200' : 'text-rose-600'}`}>
                      {b.price} ج.م
                    </span>
                  </button>
                ))}
              </div>
              {/* إذا كان الأساس مفعلاً له ظهور قائمة بدون */}
              {base.hasNoOptions && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-300/80 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>استبعاد مكونات من الأساس ({base.name}):</span>
                    </span>
                    <span className="text-[11px] text-amber-700 font-bold">
                      {builderSelectedNoOptions.length > 0 ? `${builderSelectedNoOptions.length} مستبعد` : 'اختياري'}
                    </span>
                  </div>

                  {/* قائمة الخيارات المحددة لهذا الأساس */}
                  <div className="flex flex-wrap gap-2">
                    {(base.noOptions && base.noOptions.length > 0
                      ? base.noOptions
                      : ((useMenuStore.getState().kosharyCustomOptions && useMenuStore.getState().kosharyCustomOptions.length > 0)
                          ? useMenuStore.getState().kosharyCustomOptions
                          : defaultKosharyCustomOptions)
                    ).map((noOpt) => {
                      const isSelected = builderSelectedNoOptions.includes(noOpt);
                      return (
                        <button
                          key={noOpt}
                          type="button"
                          onClick={() => {
                            sounds.playAddChime();
                            if (isSelected) {
                              setBuilderSelectedNoOptions(builderSelectedNoOptions.filter(o => o !== noOpt));
                            } else {
                              setBuilderSelectedNoOptions([...builderSelectedNoOptions, noOpt]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                              : 'bg-white text-amber-900 border border-amber-300/80 hover:border-amber-500'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>{noOpt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Meats */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">2</span>
                <span>اختر البروتين والخلطة:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {meats.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      sounds.playAddChime();
                      setMeat(m);
                    }}
                    className={`p-3.5 rounded-2xl border text-right text-xs font-bold transition flex items-center justify-between gap-2 shadow-xs ${
                      meat.name === m.name
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                        : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50/40'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className={`text-xs font-black ${meat.name === m.name ? 'text-amber-200' : 'text-rose-600'}`}>
                      +{m.price} ج.م
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Spice Level */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">3</span>
                <span>درجة الشطة والحرارة:</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {spices.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      sounds.playAddChime();
                      setSpice(s.name);
                    }}
                    className={`p-3.5 rounded-2xl border text-center text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${
                      spice === s.name
                        ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                        : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50/40'
                    }`}
                  >
                    <span className="text-sm">{s.icon}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Crunchy Toppings */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">4</span>
                <span>مقرمشات وحركات الأكيلة (اختر ما تحب):</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {toppings.map((top) => {
                  const isChecked = selectedToppings.some(t => t.name === top.name);
                  return (
                    <button
                      key={top.name}
                      type="button"
                      onClick={() => toggleTopping(top)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-xs ${
                        isChecked
                          ? 'bg-rose-700 text-white border-rose-700 shadow-sm ring-2 ring-rose-300'
                          : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50/40'
                      }`}
                    >
                      {isChecked ? <Check className="w-4 h-4 text-amber-300" /> : <Plus className="w-4 h-4 text-slate-400" />}
                      <span>{top.name}</span>
                      <span className={isChecked ? 'text-amber-200' : 'text-rose-600'}>
                        (+{top.price} ج)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: General Custom Notes (كتابة وإضافة أكثر من ملاحظة) */}
            <div className="space-y-2.5 pt-2 border-t border-rose-200/70">
              <label className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">5</span>
                  <span>ملاحظات خاصة للشيف (يمكنك كتابة وإضافة أكثر من ملاحظة):</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">اختياري</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customNoteInput}
                  onChange={(e) => setCustomNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = customNoteInput.trim();
                      if (val && !builderCustomNotes.includes(val)) {
                        setBuilderCustomNotes([...builderCustomNotes, val]);
                        sounds.playAddChime();
                        setCustomNoteInput('');
                      }
                    }
                  }}
                  placeholder="مثال: تسوية زيادة مقرمشة، صلصة زيادة على جنب، دقة خفيفة..."
                  className="flex-1 py-2.5 px-4 rounded-xl border-2 border-rose-200 bg-white text-slate-900 text-xs font-bold focus:border-rose-500 focus:outline-none placeholder:text-slate-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = customNoteInput.trim();
                    if (val && !builderCustomNotes.includes(val)) {
                      setBuilderCustomNotes([...builderCustomNotes, val]);
                      sounds.playAddChime();
                      setCustomNoteInput('');
                    }
                  }}
                  disabled={!customNoteInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ملاحظة</span>
                </button>
              </div>

              {/* قائمة الملاحظات المضافة مع زر الحذف */}
              {builderCustomNotes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {builderCustomNotes.map((note, nIdx) => (
                    <span
                      key={nIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 border border-rose-200 text-rose-800 animate-fadeIn"
                    >
                      <Edit3 className="w-3 h-3 text-rose-600" />
                      <span>{note}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBuilderCustomNotes(builderCustomNotes.filter((_, i) => i !== nIdx));
                        }}
                        className="w-4 h-4 rounded-full hover:bg-rose-200 text-rose-500 hover:text-rose-800 flex items-center justify-center transition cursor-pointer"
                        title="إزالة هذه الملاحظة"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Side: High-End Live Recipe Summary Card (Span 5 cols) */}
          <div className="lg:col-span-5 w-full">
            <div className="rounded-3xl bg-white border-2 border-rose-200 p-6 sm:p-7 shadow-[0_20px_50px_-10px_rgba(225,29,72,0.15)] space-y-5">
              
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-rose-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">ملخص طاجنك المبتكر</h3>
                    <p className="text-[11px] text-rose-600 font-bold">تسوية طازجة بالفرن</p>
                  </div>
                </div>
                
                <span className="text-xs font-black text-white bg-rose-600 px-3 py-1 rounded-full shadow-xs">
                  طلب خاص
                </span>
              </div>

              {/* Recipe Layers Preview */}
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-100/80">
                  <span className="font-bold text-slate-900">🍲 الأساس:</span>
                  <span className="font-semibold text-slate-800">{base.name}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-100/80">
                  <span className="font-bold text-slate-900">🥩 البروتين:</span>
                  <span className="font-bold text-rose-700">{meat.name}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-100/80">
                  <span className="font-bold text-slate-900">🌶️ الشطة:</span>
                  <span className="font-semibold text-slate-800">{spice}</span>
                </div>
                
                <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100/80 space-y-1">
                  <div className="font-bold text-slate-900">✨ الإضافات المختارة:</div>
                  <div className="text-[11px] text-slate-600 pr-2">
                    {selectedToppings.length > 0
                      ? selectedToppings.map(t => t.name).join(' • ')
                      : 'بدون إضافات إضافية'}
                  </div>
                </div>

                {/* استبعاد بدون */}
                {builderSelectedNoOptions.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1 animate-fadeIn">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>قائمة بدون (مستبعد):</span>
                    </div>
                    <div className="text-[11px] text-amber-800 font-bold pr-2">
                      {builderSelectedNoOptions.join(' • ')}
                    </div>
                  </div>
                )}

                {/* ملاحظات خاصة للشيف */}
                {builderCustomNotes.length > 0 && (
                  <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-1 animate-fadeIn">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-rose-600" />
                      <span>ملاحظات خاصة للشيف ({builderCustomNotes.length}):</span>
                    </div>
                    <div className="text-[11px] text-rose-800 font-bold pr-2 flex flex-col gap-0.5">
                      {builderCustomNotes.map((cn, ci) => (
                        <span key={ci}>• {cn}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Price Calculation & CTA Button */}
              <div className="pt-4 border-t border-rose-100 space-y-4">
                <div className="flex items-baseline justify-between bg-gradient-to-r from-rose-50 to-amber-50/50 p-4 rounded-2xl border border-rose-100">
                  <span className="text-xs font-black text-slate-600">السعر الإجمالي لطاجنك:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-rose-600">
                      {total}
                    </span>
                    <span className="text-sm font-black text-amber-600">
                      جنيه مصري
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddCustomDish}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-base shadow-xl ruby-button-shadow flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>أضف طاجنك المبتكر للسلة فوراً</span>
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
