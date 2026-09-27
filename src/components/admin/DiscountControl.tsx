'use client';

import React from 'react';
import { Percent, Coins } from 'lucide-react';
import { ItemDiscount } from '@/types';
import { applyItemDiscount, sanitizeDiscount } from '@/lib/itemDiscount';

interface DiscountControlProps {
  label: string;
  hint?: string;
  samplePrice?: number;
  value?: ItemDiscount | null;
  onChange: (next: ItemDiscount | undefined) => void;
}

export const DiscountControl: React.FC<DiscountControlProps> = ({
  label,
  hint,
  samplePrice = 100,
  value,
  onChange,
}) => {
  const enabled = Boolean(value?.isEnabled);
  const type = value?.type === 'amount' ? 'amount' : 'percent';
  const rawValue = Number(value?.value) || 0;
  const previewSale = applyItemDiscount(samplePrice, sanitizeDiscount(value));

  const emit = (patch: Partial<ItemDiscount>) => {
    const next: ItemDiscount = {
      isEnabled: patch.isEnabled ?? enabled,
      type: patch.type ?? type,
      value: patch.value ?? rawValue,
    };
    if (!next.isEnabled || !next.value || next.value <= 0) {
      onChange(undefined);
      return;
    }
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-amber-200">{label}</p>
          {hint && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => emit({ isEnabled: !enabled, value: enabled ? rawValue : (rawValue || 10), type })}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black border transition cursor-pointer ${
            enabled
              ? 'bg-emerald-600 text-white border-emerald-400/40'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {enabled ? 'مفعّل' : 'متوقف'}
        </button>
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => emit({ type: 'percent' })}
              className={`py-2 rounded-xl text-[11px] font-black border flex items-center justify-center gap-1 cursor-pointer ${
                type === 'percent'
                  ? 'bg-rose-600 text-white border-rose-400/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              نسبة %
            </button>
            <button
              type="button"
              onClick={() => emit({ type: 'amount' })}
              className={`py-2 rounded-xl text-[11px] font-black border flex items-center justify-center gap-1 cursor-pointer ${
                type === 'amount'
                  ? 'bg-rose-600 text-white border-rose-400/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              مبلغ ج.م
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={type === 'percent' ? 100 : 100000}
              value={rawValue || ''}
              onChange={(e) => emit({ value: Number(e.target.value) || 0 })}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-200 font-black text-sm text-center focus:outline-none"
            />
            <span className="text-[11px] font-black text-slate-400 w-10">
              {type === 'percent' ? '%' : 'ج.م'}
            </span>
          </div>

          <p className="text-[10px] text-emerald-300 font-bold">
            مثال: صنف بـ {samplePrice} ج.م يبقى {previewSale} ج.م
          </p>
        </>
      )}
    </div>
  );
};
