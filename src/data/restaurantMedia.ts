export interface RestaurantMediaItem {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
}

export const officialMediaLibrary: RestaurantMediaItem[] = [
  // --- الصور الأساسية الحقيقية للمطعم ---
  {
    id: 'koshary-box',
    title: 'علبة كشري لؤلؤة سنهور (سوبر لوكس)',
    category: 'العلب الملكية',
    url: '/menu/koshary-box.jpg',
    description: 'صورة حقيقية لعلبة كشري لؤلؤة سنهور بالصلصة والدقة والتقلية المقرمشة',
  },
  {
    id: 'koshary-bag',
    title: 'كيس كشري شعبي أصيل',
    category: 'العلب الملكية',
    url: '/menu/koshary-bag.jpg',
    description: 'كيس كشري حراري شعبي على الأصول بخلطة لؤلؤة سنهور',
  },
  {
    id: 'tagine-meat',
    title: 'طاجن لحمة بلدي فرن فخار',
    category: 'الطواجن الفخارة',
    url: '/menu/tagine-meat.jpg',
    description: 'طاجن فخار بلدي ساخن ومحمر بقطع اللحم المفروم المتبل',
  },
  {
    id: 'tagine-chicken',
    title: 'طاجن فراخ فرن بلدي فخار',
    category: 'الطواجن الفخارة',
    url: '/menu/tagine-chicken.jpg',
    description: 'طاجن فخار بلدي محمر بقطع الدجاج الفريش بالخلطة والصلصة',
  },
  {
    id: 'koshary-sandwich',
    title: 'ساندوتش كشري في عيش بلدي',
    category: 'سندوتشات وسناكس',
    url: '/menu/koshary-sandwich.jpg',
    description: 'رغيف عيش بلدي طازج محشو كشري بالدقة والصلصة والتقلية المقرمشة',
  },
  {
    id: 'crispy-onion',
    title: 'بصل مقرمش ذهبي (تقلية مخصوص)',
    category: 'الإضافات الملكية',
    url: '/menu/crispy-onion.jpg',
    description: 'بصل مقرمش ذهبي محمر بزيت نقي بدون مرارة في بولة بيضاء',
  },
  {
    id: 'lentils',
    title: 'عدس بجبة فاخر متبل',
    category: 'الإضافات الملكية',
    url: '/menu/lentils.jpg',
    description: 'عدس بني بلدي متبل ومسلوق على الطريقة المصرية الأصيلة',
  },
  {
    id: 'hot-chili',
    title: 'شطة زيت حارة جداً',
    category: 'الإضافات الملكية',
    url: '/menu/hot-chili.jpg',
    description: 'شطة زيت حارة نار مجهزة خصيصاً لأصحاب القلوب القوية',
  },
  {
    id: 'chickpeas',
    title: 'حمص شام بلدي مسلوق',
    category: 'الإضافات الملكية',
    url: '/menu/chickpeas.jpg',
    description: 'حبات الحمص البلدي المطهوة ببطء مع نكهة الكمون والليمون',
  },
  {
    id: 'tomato-sauce',
    title: 'صلصة طماطم بلدي مسبكة',
    category: 'الإضافات الملكية',
    url: '/menu/tomato-sauce.jpg',
    description: 'صلصة خاصة مسبكة بالثوم والخل والكزبرة والبهارات',
  },
  {
    id: 'pickles',
    title: 'طرشي ومخلل بلدي مشكل',
    category: 'الإضافات الملكية',
    url: '/menu/pickles.jpg',
    description: 'بولة طرشي ومخلل مشكل بلدي جزر وخيار وفلفل شطة ولفت',
  },
  {
    id: 'fresh-bread',
    title: 'عيش بلدي طازج مخبوز',
    category: 'الإضافات الملكية',
    url: '/menu/fresh-bread.jpg',
    description: 'رغيف عيش بلدي محمص وطري طازج من الفرن',
  },
  {
    id: 'toasted-bread',
    title: 'عيش محمص مقرمش متبل',
    category: 'الإضافات الملكية',
    url: '/menu/toasted-bread.jpg',
    description: 'مثلثات عيش شامي وتوست مقرمشة ذهبية متبلة بالبهارات الخاصة',
  },
  {
    id: 'rice-pudding',
    title: 'أرز باللبن فاخر بالمكسرات والقرفة',
    category: 'المشروبات والحلويات',
    url: '/menu/rice-pudding.jpg',
    description: 'طاجن فخار أرز باللبن كريمي بالقشطة ومزين بالفستق والمكسرات والقرفة',
  },
  {
    id: 'cold-drinks',
    title: 'مشروبات غازية ومياه مثلجة',
    category: 'المشروبات والحلويات',
    url: '/menu/cold-drinks.jpg',
    description: 'كوب كولا مثلج مع ثلج ومنعش وزجاجة مياه نقية مثلجة',
  },

  // --- أصناف إضافية ---
  {
    id: 'box-double',
    title: 'علبة دوبل مشبعة',
    category: 'العلب الملكية',
    url: '/menu/koshary-box.jpg',
    description: 'كمية مضاعفة للمكرونة والعدس والأرز لعشاق الإشباع التام',
  },
  {
    id: 'extra-daqa',
    title: 'دقة بالخل والثوم والليمون',
    category: 'الإضافات الملكية',
    url: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?q=80&w=800&auto=format&fit=crop',
    description: 'دقة اللؤلؤة المميزة بمزيج الخل الصافي والثوم المفروم والكمون والليمون',
  },
  {
    id: 'drink-mirinda',
    title: 'كانز ميرندا برتقال مثلج',
    category: 'المشروبات والحلويات',
    url: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?q=80&w=800&auto=format&fit=crop',
    description: 'مشروب غازي بطعم البرتقال المنعش والمثلج',
  },
  {
    id: 'drink-7up',
    title: 'كانز سفن آب ليمون مثلج',
    category: 'المشروبات والحلويات',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    description: 'مشروب غازي بطعم الليمون المنعش خفيف ولذيذ مع الكشري',
  },
];
