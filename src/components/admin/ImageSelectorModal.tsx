'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Check, Upload, Link2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { officialMediaLibrary } from '@/data/restaurantMedia';

interface ImageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  currentImageUrl: string;
  onSelectImage: (newImageUrl: string) => void;
}

export const ImageSelectorModal: React.FC<ImageSelectorModalProps> = ({
  isOpen,
  onClose,
  itemName,
  currentImageUrl,
  onSelectImage,
}) => {
  const [activeTab, setActiveTab] = useState<'official' | 'external'>('official');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImageUrl);
  const [urlInput, setUrlInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSelectedUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const categories = ['all', ...Array.from(new Set(officialMediaLibrary.map((m) => m.category)))];
  const filteredMedia = selectedCategory === 'all'
    ? officialMediaLibrary
    : officialMediaLibrary.filter((m) => m.category === selectedCategory);

  const handleApplyUrlInput = () => {
    if (urlInput.trim()) {
      setSelectedUrl(urlInput.trim());
    }
  };

  const handleSave = () => {
    onSelectImage(selectedUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50 via-white to-amber-50 border-b border-rose-100/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> اختيار وضبط صورة الصنف
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {itemName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Official vs External */}
        <div className="flex border-b border-slate-200 bg-slate-50/60 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'official'
                ? 'bg-white text-rose-700 shadow-sm border border-rose-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>مكتبة صور المطعم المجهزة (صور من دول)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700">
              {officialMediaLibrary.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'external'
                ? 'bg-white text-rose-700 shadow-sm border border-rose-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استخدام صورة من بره (رفع / رابط)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Active Tab 1: Official Restaurant Photos */}
          {activeTab === 'official' && (
            <div className="space-y-4">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'all' ? `الكل (${officialMediaLibrary.length})` : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">
                  صور عالية الدقة (800x800) مجهزة بمقاسات المنيو مع أنيميشن متحرك عند الوقوف:
                </p>
                <span className="text-xs text-rose-600 font-bold">
                  {filteredMedia.length} صنف متاح
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredMedia.map((media) => {
                  const isSelected = selectedUrl === media.url;
                  return (
                    <div
                      key={media.id}
                      onClick={() => setSelectedUrl(media.url)}
                      className={`group relative p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/50 shadow-md ring-2 ring-rose-400/30'
                          : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50'
                      }`}
                    >
                      {/* Thumbnail with animation preview */}
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                        <Image
                          src={media.url}
                          alt={media.title}
                          fill
                          className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-full">
                            {media.category}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 mt-1 truncate">
                          {media.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          {media.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Tab 2: External Images */}
          {activeTab === 'external' && (
            <div className="space-y-4">
              {/* Option A: Upload from Device */}
              <div className="border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-2xl p-6 text-center bg-slate-50/70 hover:bg-rose-50/20 transition cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-2 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  اضغط هنا لرفع صورة من جهازك
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  يدعم صور JPG, PNG, WebP حتى 5 ميجابايت
                </p>
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {uploadError}
                </p>
              )}

              {/* Option B: Enter Web URL */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-slate-500" />
                  أو أدخل رابط صورة من الإنترنت (URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    dir="ltr"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500 text-xs text-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrlInput}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                  >
                    معاينة
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Box with Animated Hover */}
          <div className="border border-slate-200 rounded-2xl p-3 sm:p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                معاينة حية للصورة داخل كارت المنيو (قف بالماوس لرؤية الحركة):
              </span>
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                متحركة تلقائياً
              </span>
            </div>

            <div className="max-w-xs mx-auto group relative rounded-2xl elevated-card-3d p-3 bg-white border border-rose-100 shadow-md">
              <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100 border border-rose-100/90 shadow-inner group-hover:border-rose-300 transition-colors">
                <Image
                  src={selectedUrl || '/menu/koshary-box.jpg'}
                  alt="معاينة الصنف"
                  fill
                  unoptimized={Boolean(selectedUrl && selectedUrl.startsWith('data:'))}
                  className="object-cover transform group-hover:scale-110 group-hover:rotate-1 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white font-black text-xs">
                  معاينة المظهر
                </div>
              </div>
              <div className="mt-2 text-center">
                <h4 className="font-black text-sm text-slate-900">{itemName}</h4>
                <p className="text-[11px] text-rose-600 font-bold mt-0.5">حركة زووم وميلان انسيابية عند الوقوف بالماوس</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-md ruby-button-shadow transition active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>حفظ وتطبيق الصورة على الصنف</span>
          </button>
        </div>

      </div>
    </div>
  );
};
