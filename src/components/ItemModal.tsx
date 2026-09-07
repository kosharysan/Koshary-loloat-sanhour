'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, ShoppingBag, Sparkles } from 'lucide-react';
import { MenuItem } from '@/types';
import { useCartStore } from '@/lib/store';
import { sounds } from '@/lib/sound';
import { useFlyToCart } from '@/context/FlyAnimationContext';

interface ItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  const { addItem } = useCartStore();
  const { flyToCart } = useFlyToCart();
  const modalImageRef = useRef<HTMLDivElement>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (item && item.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0].name);
    } else {
      setSelectedSize('');
    }
    setQuantity(1);
    setNotes('');
  }, [item]);

  if (!item) return null;

  const currentPrice = selectedSize && item.sizes
    ? item.sizes.find(s => s.name === selectedSize)?.price || item.price
    : item.price;

  const totalPrice = currentPrice * quantity;

  const handleAddQuickNote = (noteText: string) => {
    if (notes.includes(noteText)) {
      setNotes(notes.replace(noteText, '').trim());
    } else {
      setNotes((notes ? notes + '، ' : '') + noteText);
    }
  };

  const handleAddToCart = () => {
    sounds.playAddChime();
    if (modalImageRef.current) {
      flyToCart(modalImageRef.current, item.imageUrl);
    }
    addItem(item, quantity, selectedSize || undefined, notes || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-2xl animate-scaleUp">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 flex items-center justify-center transition border border-slate-200 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media Top */}
        <div 
          ref={modalImageRef}
          className="relative w-full h-56 bg-slate-100"
        >
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>
          
          <div className="absolute bottom-4 right-5 left-5">
            <span className="text-xs font-bold text-amber-300 bg-black/60 px-3 py-1 rounded-full border border-white/20 inline-flex items-center gap-1 mb-1.5 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              تخصيص الصنف
            </span>
            <h3 className="text-2xl font-black text-white drop-shadow-md">{item.name}</h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto no-scrollbar">
          <p className="text-sm text-slate-600 leading-relaxed font-normal">
            {item.description}
          </p>

          {/* Sizes if available */}
          {item.sizes && item.sizes.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                اختر الحجم أو المقاس:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {item.sizes.map((s) => {
                  const isSelected = selectedSize === s.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelectedSize(s.name)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition ${
                        isSelected
                          ? 'bg-red-50/80 border-red-600 text-red-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="text-red-600 font-black">{s.price} ج.م</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Notes Suggestions */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
              ملاحظات الشيف السريعة (اختياري):
            </label>
            <div className="flex flex-wrap gap-2">
              {['صلصة برة', 'شطة خفيفة', 'تقلية زيادة', 'دقة زيادة', 'عدس زيادة', 'بدون شطة'].map((noteTag) => (
                <button
                  key={noteTag}
                  type="button"
                  onClick={() => handleAddQuickNote(noteTag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    notes.includes(noteTag)
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  + {noteTag}
                </button>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي تعليمات خاصة أخرى للشيف..."
              rows={2}
              className="w-full mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-7 text-center text-base font-black text-slate-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center transition active:scale-90 shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button with Total */}
          <button
            onClick={handleAddToCart}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg ruby-button-shadow flex items-center justify-between transition active:scale-95"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              أضف للطلب
            </span>
            <span className="font-black text-white bg-black/20 px-2.5 py-0.5 rounded-lg text-sm">
              {totalPrice} ج.م
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
