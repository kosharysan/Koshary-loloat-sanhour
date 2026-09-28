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
    id: 'koshary-bowl',
    title: 'بولة كشري لؤلؤة سنهور المخصوصة',
    category: 'العلب الملكية',
    url: '/menu/koshary-bowl.jpg',
    description: 'بولة كشري لؤلؤة سنهور الساخنة الفاخرة غنية بالعدس والتقلية المقرمشة وحمص الشام والصلصة',
  },
  {
    id: 'koshary-box',
    title: 'علبة كشري لؤلؤة سنهور (سوبر لوكس)',
    category: 'العلب الملكية',
    url: '/menu/koshary-box.jpg',
    description: 'صورة حقيقية لعلبة كشري لؤلؤة سنهور بالصلصة والدقة والتقلية المقرمشة',
  },
  {
    id: 'koshary-bag',
    title: 'كيس كشري لؤلؤة سنهور المخصوص',
    category: 'العلب الملكية',
    url: '/menu/koshary-bag.jpg',
    description: 'كيس كشري حراري أصيل مطبوع بماركة كشري وطواجن اللؤلؤة مع التقلية المقرمشة وحمص الشام',
  },
  {
    id: 'koshary-bag-classic',
    title: 'كيس كشري شعبي كلاسيك',
    category: 'العلب الملكية',
    url: '/menu/koshary-bag-classic.jpg',
    description: 'كيس كشري حراري شعبي على الأصول بخلطة لؤلؤة سنهور',
  },
  {
    id: 'tagine-meat',
    title: 'طاجن لحمة بلدي فاخر بصلصة ودقة',
    category: 'الطواجن الفخارة',
    url: '/menu/tagine-meat.jpg',
    description: 'طاجن مكرونة محمر باللحمة البلدي المخصوصة والصلصة المسبكة والليمون في بولة رخامية ملكية',
  },
  {
    id: 'tagine-meat-special',
    title: 'طاجن لحمة بلدي ملكي (سبيشيال)',
    category: 'الطواجن الفخارة',
    url: '/menu/tagine-meat-special.jpg',
    description: 'طاجن مكرونة محمر باللحمة البلدي المخصوصة والصلصة المسبكة والليمون في بولة رخامية ملكية',
  },
  {
    id: 'tagine-chicken',
    title: 'طاجن فراخ فرن ملكي محمر',
    category: 'الطواجن الفخارة',
    url: '/menu/tagine-chicken.jpg',
    description: 'طاجن مكرونة فرن بقطع الدجاج الفريش المتبلة المحمرة والصلصة الغنية في بولة رخامية فاخرة',
  },
  {
    id: 'tagine-chicken-special',
    title: 'طاجن فراخ فرن ملكي (سبيشيال)',
    category: 'الطواجن الفخارة',
    url: '/menu/tagine-chicken-special.jpg',
    description: 'طاجن مكرونة فرن بقطع الدجاج الفريش المتبلة المحمرة والصلصة الغنية في بولة رخامية فاخرة',
  },
  {
    id: 'koshary-sandwich',
    title: 'ساندوتش كشري مخصوص في عيش بلدي',
    category: 'سندوتشات وسناكس',
    url: '/menu/koshary-sandwich.jpg',
    description: 'ساندوتش كشري ساخن بالتقلية المقرمشة والعدس والحمص داخل رغيف بلدي في بولة رخامية فاخرة',
  },
  {
    id: 'koshary-sandwich-special',
    title: 'ساندوتش كشري ملكي (سبيشيال)',
    category: 'سندوتشات وسناكس',
    url: '/menu/koshary-sandwich-special.jpg',
    description: 'ساندوتش كشري ساخن بالتقلية المقرمشة والعدس والحمص داخل رغيف بلدي في بولة رخامية فاخرة',
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
