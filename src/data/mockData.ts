import { Category, MenuItem, DeliveryZone, RestaurantInfo } from '@/types';

export const restaurantInfo: RestaurantInfo = {
  name: 'لؤلؤة سنهور',
  tagline: 'كشري وطواجن على أصولها',
  description: 'نهتم دائماً بجودة منتجاتنا وأصالتها لتتناسب مع الجميع، وهدفنا دائماً تقديم أعلى جودة وطعم لا يُنسى في قلب الفيوم.',
  phone: '01050185556',
  whatsapp: '201050185556',
  address: 'سنهور المدينة - الشارع الرئيسي - الفيوم',
  googleMapsUrl: 'https://maps.google.com/?q=سنهور+المدينة+الفيوم',
  workingHours: 'يومياً: 10:00 ص - 02:00 ص',
  isOpen: true,
  logoUrl: '/logo.jpg',
  coverUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?q=80&w=1600&auto=format&fit=crop',
  cashWalletNumber: '01050185556',
  cashWalletName: 'إدارة لؤلؤة سنهور',
  instapayHandle: 'lolat-sanhour@instapay',
  instapayLink: 'https://ipn.eg'
};

export const categories: Category[] = [
  {
    id: 'boxes',
    name: 'العلب الملكية',
    nameEn: 'Royal Bowls',
    icon: 'Crown',
    description: 'كشري مصري أصيل بمقاسات مختلفة وخلطة لؤلؤة سنهور السرية',
    displayOrder: 1,
    isKoshary: true
  },
  {
    id: 'casseroles',
    name: 'الطواجن الفخارة',
    nameEn: 'Clay Casseroles',
    icon: 'Flame',
    description: 'طواجن فرن ساخنة ومحمرة بألذ تتبيلة لحمة وفراخ وكبدة',
    displayOrder: 2
  },
  {
    id: 'mixes',
    name: 'الميكسات المخصوصة',
    nameEn: 'Special Mixes',
    icon: 'Sparkles',
    description: 'إبداع لؤلؤة سنهور: طاجن فرن مسكوب على كشري ساخن',
    displayOrder: 3
  },
  {
    id: 'sandwiches',
    name: 'سندوتشات وسناكس',
    nameEn: 'Sandwiches',
    icon: 'Sandwich',
    description: 'سندوتشات كشري سريعة ومشبعة على الأصول',
    displayOrder: 4
  },
  {
    id: 'extras',
    name: 'الإضافات الملكية',
    nameEn: 'Extras & Addons',
    icon: 'PlusCircle',
    description: 'تقلية مقرمشة، عيش محمص، صلصة، ودقة لزوم الحركات',
    displayOrder: 5,
    isExtras: true
  },
  {
    id: 'drinks',
    name: 'المشروبات والحلويات',
    nameEn: 'Drinks & Desserts',
    icon: 'Coffee',
    description: 'مشروبات غازية مثلجة وأرز باللبن فاخر',
    displayOrder: 6
  }
];

export const menuItems: MenuItem[] = [
  // --- العلب الملكية ---
  {
    id: 'box-special',
    categoryId: 'boxes',
    name: 'علبة لؤلؤة سنهور الخاصة',
    description: 'التوليفة الملكية: مكرونات مشكلة، أرز بالشعرية الذهبية، عدس بلدي، حمص، تقلية مقرمشة زيادة، مع صلصة ودقة خاصة',
    price: 45,
    originalPrice: 50,
    imageUrl: '/menu/koshary-box.jpg',
    isAvailable: true,
    displayOrder: 1,
    isPopular: true,
    tags: ['توقيع المحل', 'الأكثر طلباً'],
    sizes: [
      { name: 'عادي', price: 45 },
      { name: 'سوبر لؤلؤة', price: 55 }
    ]
  },
  {
    id: 'box-lux',
    categoryId: 'boxes',
    name: 'كيس كشري شعبي أصيل',
    description: 'كشري شعبي ساخن في كيس حراري على الأصول غني بالعدس والمكرونة والتقلية المقرمشة مع أكياس الصلصة والدقة',
    price: 25,
    imageUrl: '/menu/koshary-bag.jpg',
    isAvailable: true,
    displayOrder: 2,
    tags: ['أكلة شعبية', 'على الأصول']
  },
  {
    id: 'box-double',
    categoryId: 'boxes',
    name: 'علبة دوبل',
    description: 'كمية مضاعفة للمشويات والمكرونة والعدس لعشاق الإشباع التام',
    price: 30,
    imageUrl: '/menu/koshary-box.jpg',
    isAvailable: true,
    displayOrder: 3,
    isPopular: true,
    tags: ['إشباع فوري']
  },
  {
    id: 'box-big',
    categoryId: 'boxes',
    name: 'علبة بيج اللؤلؤة',
    description: 'الحجم الكبير المشبع جداً بإضافات فاخرة وتغليف حراري خاص',
    price: 50,
    imageUrl: '/menu/koshary-box.jpg',
    isAvailable: true,
    displayOrder: 4,
    tags: ['حجم عائلي فردي']
  },
  {
    id: 'box-lion',
    categoryId: 'boxes',
    name: 'علبة الأسد (الوحش)',
    description: 'أكبر وأضخم علبة كشري في الفيوم، ممتلئة بالعدس والحمص والمكرونة والصلصة المخصوصة',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 5,
    isPopular: true,
    tags: ['تحدي الأكيلة']
  },

  // --- الطواجن الفخارة ---
  {
    id: 'tagine-meat',
    categoryId: 'casseroles',
    name: 'طاجن لحمة بلدي فرن',
    description: 'طاجن مكرونة فرن مسواة على نار هادئة بقطع اللحم المفروم المتبل بخلطة بهارات اللؤلؤة مع الصلصة الغنية',
    price: 50,
    imageUrl: '/menu/tagine-meat.jpg',
    isAvailable: true,
    displayOrder: 1,
    isPopular: true,
    tags: ['الأعلى تقييماً', 'طازج من الفرن'],
    sizes: [
      { name: 'حجم وسط', price: 50 },
      { name: 'حجم كبير ملوكي', price: 65 }
    ]
  },
  {
    id: 'tagine-chicken',
    categoryId: 'casseroles',
    name: 'طاجن فراخ شاورما متبلة',
    description: 'طاجن مكرونة فرن بقطع صدور الدجاج الفريش المتبلة بصلصة الباربكيو والطماطم المسبكة',
    price: 50,
    imageUrl: '/menu/tagine-chicken.jpg',
    isAvailable: true,
    displayOrder: 2,
    isPopular: true,
    tags: ['طازج من الفرن']
  },
  {
    id: 'tagine-liver',
    categoryId: 'casseroles',
    name: 'طاجن كبدة إسكندراني مشطشطة',
    description: 'طاجن مكرونة فرن بالخلطة الإسكندرانية الأصلية، كبدة شرائح رفيعة بثوم وفلفل حار وليمون',
    price: 40,
    imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 3,
    isSpicy: true,
    tags: ['حار وسبايسي']
  },
  {
    id: 'tagine-royal-mix',
    categoryId: 'casseroles',
    name: 'طاجن ميكس ملوكي (لحمة + فراخ + كبدة)',
    description: 'تجربة فاخرة تجمع بين اللحم المفروم وقطع الفراخ والكبدة المشطشطة في طاجن فخاري واحد',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 4,
    isPopular: true,
    tags: ['VIP', 'اختيار الشيف']
  },

  // --- الميكسات المخصوصة ---
  {
    id: 'mix-chicken-koshary',
    categoryId: 'mixes',
    name: 'طاجن فراخ ع كشري',
    description: 'مزيج المكرونة والعدس والأرز والصلصة يعلوه طاجن فراخ ساخن ومتبل بالصلصة',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 1,
    isPopular: true,
    tags: ['ميكس جبار']
  },
  {
    id: 'mix-meat-koshary',
    categoryId: 'mixes',
    name: 'طاجن لحمة ع كشري',
    description: 'اللحم المفروم المتبل الساخن مسكوب فوق طبق كشري اللؤلؤة الملكي مع التقلية',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 2,
    tags: ['ميكس ملوكي']
  },
  {
    id: 'mix-liver-koshary',
    categoryId: 'mixes',
    name: 'طاجن كبدة ع كشري',
    description: 'الكبدة الإسكندراني الحارة مع الكشري والصلصة المسبكة والدقة بالخل والثوم',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 3,
    isSpicy: true,
    tags: ['عشاق السبايسي']
  },

  // --- سندوتشات وسناكس ---
  {
    id: 'sandwich-koshary',
    categoryId: 'sandwiches',
    name: 'سندوتش كشري اللؤلؤة المخصوص',
    description: 'عيش بلدي طازج محشو بكشري ساخن وعدس وحمص مع صوص الطماطم والتقلية المقرمشة',
    price: 7.5,
    imageUrl: '/menu/koshary-sandwich.jpg',
    isAvailable: true,
    displayOrder: 1,
    tags: ['سناك سريع']
  },

  // --- الإضافات الملكية ---
  {
    id: 'extra-toast',
    categoryId: 'extras',
    name: 'عيش محمص مقرمش متبل',
    description: 'مثلثات عيش شامي وتوست مقرمشة ذهبية متبلة بالزعتر والكمون والملح الخفيف',
    price: 10,
    imageUrl: '/menu/toasted-bread.jpg',
    isAvailable: true,
    displayOrder: 1,
    isPopular: true,
    tags: ['قرمشة لا تقاوم']
  },
  {
    id: 'extra-pickles',
    categoryId: 'extras',
    name: 'طرشي ومخلل بلدي مشكل',
    description: 'بولة مخلل مشكل بلدي طازج (جزر وخيار وفلفل شطة ولفت) تفتح النفس بجانب الكشري',
    price: 5,
    imageUrl: '/menu/pickles.jpg',
    isAvailable: true,
    displayOrder: 2,
    isPopular: true,
    tags: ['يفتح النفس']
  },
  {
    id: 'extra-crispy-onion',
    categoryId: 'extras',
    name: 'بصل مقرمش ذهبي (تقلية مخصوص)',
    description: 'بصل مقطع شرائح ومحمر بزيت نقي حتى القرمشة الكاملة دون أي مرارة',
    price: 10,
    imageUrl: '/menu/crispy-onion.jpg',
    isAvailable: true,
    displayOrder: 3,
    isPopular: true,
    tags: ['سر الطعم']
  },
  {
    id: 'extra-sauce',
    categoryId: 'extras',
    name: 'صلصة طماطم بلدي مسبكة',
    description: 'صلصة خاصة محضرة من الطماطم الطازجة مع الثوم والخل والكزبرة',
    price: 10,
    imageUrl: '/menu/tomato-sauce.jpg',
    isAvailable: true,
    displayOrder: 4,
  },
  {
    id: 'extra-chickpeas',
    categoryId: 'extras',
    name: 'حمص شام بلدي مسلوق',
    description: 'حبات الحمص البلدي المطهوة ببطء مع نكهة الكمون والليمون',
    price: 10,
    imageUrl: '/menu/chickpeas.jpg',
    isAvailable: true,
    displayOrder: 5,
  },
  {
    id: 'extra-lentils',
    categoryId: 'extras',
    name: 'عدس بجبة فاخر',
    description: 'طبق عدس بني متبل ومسلوق على الطريقة المصرية الأصيلة',
    price: 10,
    imageUrl: '/menu/lentils.jpg',
    isAvailable: true,
    displayOrder: 6,
  },
  {
    id: 'extra-hot-chili',
    categoryId: 'extras',
    name: 'شطة زيت لؤلؤة سنهور',
    description: 'شطة زيت حارة جداً ومجهزة خصيصاً لأصحاب القلوب القوية',
    price: 10,
    imageUrl: '/menu/hot-chili.jpg',
    isAvailable: true,
    displayOrder: 7,
    isSpicy: true,
    tags: ['حار نار 🔥']
  },
  {
    id: 'extra-daqa',
    categoryId: 'extras',
    name: 'دقة بالخل والثوم والليمون',
    description: 'دقة اللؤلؤة المميزة بمزيج الخل الصافي والثوم المفروم والكمون والليمون',
    price: 5,
    imageUrl: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 8,
  },
  {
    id: 'extra-bread',
    categoryId: 'extras',
    name: 'عيش بلدي طازج مخبوز',
    description: 'رغيف عيش بلدي محمص وطري طازج من الفرن',
    price: 2,
    imageUrl: '/menu/fresh-bread.jpg',
    isAvailable: true,
    displayOrder: 9,
  },

  // --- المشروبات والحلويات ---
  {
    id: 'dessert-rice-milk',
    categoryId: 'drinks',
    name: 'أرز باللبن فاخر بالمكسرات والقرفة',
    description: 'أرز باللبن كريمي غني بالقشطة مسوى في طاجن فخار ومزين بالفستق والمكسرات ورشة قرفة',
    price: 20,
    imageUrl: '/menu/rice-pudding.jpg',
    isAvailable: true,
    displayOrder: 1,
    isPopular: true,
    tags: ['تحلية ملوكية']
  },
  {
    id: 'drink-pepsi',
    categoryId: 'drinks',
    name: 'مشروبات غازية ومياه مثلجة',
    description: 'كوب مشروب غازي مثلج بالثلج المنعش وزجاجة مياه معدنية نقية',
    price: 20,
    imageUrl: '/menu/cold-drinks.jpg',
    isAvailable: true,
    displayOrder: 2,
  },
  {
    id: 'drink-mirinda',
    categoryId: 'drinks',
    name: 'كانز ميرندا برتقال (330 مل)',
    description: 'مشروب غازي بطعم البرتقال المنعش',
    price: 20,
    imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 3,
  },
  {
    id: 'drink-7up',
    categoryId: 'drinks',
    name: 'كانز سفن آب ليمون (330 مل)',
    description: 'مشروب غازي بطعم الليمون المنعش خفيف ولذيذ مع الكشري',
    price: 20,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 4,
  },
  {
    id: 'drink-water-small',
    categoryId: 'drinks',
    name: 'مياه معدنية صغيرة (600 مل)',
    description: 'مياه شرب طبيعية نقية مثلجة',
    price: 8,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 5,
  },
  {
    id: 'drink-water-large',
    categoryId: 'drinks',
    name: 'مياه معدنية كبيرة (1.5 لتر)',
    description: 'مياه شرب طبيعية نقية عائلية',
    price: 10,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=800&auto=format&fit=crop',
    isAvailable: true,
    displayOrder: 6,
  }
];

export const deliveryZones: DeliveryZone[] = [
  { id: 'z-sanhour-center', name: 'سنهور المدينة (توصيل فوري)', fee: 10, minOrder: 30, estimatedMinutes: '15-25 دقيقة' },
  { id: 'z-sanhour-suburbs', name: 'أطراف سنهور ومحيط المركز', fee: 15, minOrder: 40, estimatedMinutes: '25-35 دقيقة' },
  { id: 'z-nearby-villages', name: 'القرى والمدن المجاورة', fee: 20, minOrder: 50, estimatedMinutes: '30-40 دقيقة' },
  { id: 'z-fayoum-city', name: 'مدينة الفيوم وضواحيها', fee: 25, minOrder: 60, estimatedMinutes: '35-45 دقيقة' },
  { id: 'z-other', name: 'منطقة أخرى (تحديد مع الكابتن)', fee: 20, minOrder: 40, estimatedMinutes: '30-45 دقيقة' }
];

export const smartUpsellItems: MenuItem[] = [
  menuItems.find(i => i.id === 'extra-toast')!,
  menuItems.find(i => i.id === 'extra-crispy-onion')!,
  menuItems.find(i => i.id === 'drink-pepsi')!,
  menuItems.find(i => i.id === 'dessert-rice-milk')!
];
