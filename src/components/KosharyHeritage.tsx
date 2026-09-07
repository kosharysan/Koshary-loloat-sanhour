'use client';

import React from 'react';
import Image from 'next/image';
import { Sparkles, Flame, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';

export const KosharyHeritage: React.FC = () => {
  const pillars = [
    {
      title: 'طواجن فخار أصيلة',
      subtitle: 'تستوي في الفرن على نار هادية',
      desc: 'فخار مصري حر بيحبس نكهة اللحمة المتبلة والفراخ مع مكرونة غرقانة في صلصة مسبكة بنكهة متوارثة.',
      icon: '🍲',
      badge: 'سر الصنعة',
      color: 'from-amber-500/20 to-rose-500/20',
      border: 'border-amber-200/80',
    },
    {
      title: 'التقلية الدهب المقرمشة',
      subtitle: 'بصل بلدي محمر بدون نقطة زيت زيادة',
      desc: 'بصل مقطع رفيع جداً، مقرمش بلون كراميل ودهبي، يفضل يقرمش لآخر معلقة في الطبق.',
      icon: '🧅',
      badge: 'قرمشة أصلية',
      color: 'from-rose-500/20 to-red-500/20',
      border: 'border-rose-200/80',
    },
    {
      title: 'دقة الخل والتوم والشطة الزيت',
      subtitle: 'خلطة سرية تضبط الدماغ',
      desc: 'دقة معموله بتوم بلدي مفروم وخل نقي مع كمون ومون، ومعاها شطة زيت مولعة للي بيحب الحامي الأصيل.',
      icon: '🌶️',
      badge: 'مزاج عالي',
      color: 'from-red-500/20 to-orange-500/20',
      border: 'border-red-200/80',
    },
    {
      title: 'العدس والشعرية المفلفلة',
      subtitle: 'عدس بجُبّة بلدي غني ومغذي',
      desc: 'مفلفل بحبة وحبة مع رز مصري وشعرية محمرة بدهب السمن، طبقات محسوبة بالمللي.',
      icon: '🥣',
      badge: 'جودة فندقية',
      color: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-200/80',
    },
  ];

  return (
    <section className="relative py-16 px-4 max-w-6xl mx-auto">
      
      {/* Visual Header */}
      <div className="text-center space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>سر طعم لؤلؤة سنهور الفريد</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
          ليه كشري وطواجن <span className="text-rose-600">لؤلؤة سنهور</span> مفيش زيه؟
        </h2>
        <p className="text-slate-600 text-xs sm:text-base max-w-2xl mx-auto font-medium">
          مش مجرد طبق كشري.. إحنا بنقدم تجربة طعم متوارثة بحب وإتقان، بمكونات طازة يومياً ومعايير نظافة فندقية ترضيك.
        </p>
      </div>

      {/* 4 Pillars Luxury Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {pillars.map((item, idx) => (
          <div
            key={idx}
            className="elevated-card-3d p-6 flex flex-col justify-between group overflow-hidden border border-rose-200/80 hover:border-rose-400/80 transition-all duration-300"
          >
            {/* Top Badge & Big Visual Emoji */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl sm:text-4xl transform group-hover:scale-115 transition-transform duration-300 drop-shadow-xs">
                  {item.icon}
                </span>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {item.badge}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors mb-1">
                {item.title}
              </h3>
              <p className="text-[11px] font-bold text-amber-600 mb-3">
                {item.subtitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {item.desc}
              </p>
            </div>

            {/* Bottom Accent line */}
            <div className="pt-4 mt-4 border-t border-rose-100 flex items-center gap-2 text-[11px] font-black text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>طازة من المطبخ يومياً</span>
            </div>
          </div>
        ))}
      </div>

      {/* Heritage Quality Guarantee Card */}
      <div className="mt-10 rounded-3xl elevated-stage-3d p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-2 border-rose-200/90">
        <div className="flex items-center gap-4 text-center sm:text-right">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900">
              ضمان الجودة والطعم في لؤلؤة سنهور 👑
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl font-medium">
              كل علبة كشري وكل طاجن بيتحضر مخصوص لطلبك، سخن ومحكم التغليف مع المعالق والمناديل والأكياس الحرارية ليصلك بأعلى درجة حرارة وجودة.
            </p>
          </div>
        </div>

        <a
          href="#full-menu"
          className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-md ruby-button-shadow transition active:scale-95 shrink-0"
        >
          اطلب وجبتك الآن
        </a>
      </div>

    </section>
  );
};
