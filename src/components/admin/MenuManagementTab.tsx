'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Search,
  Sliders,
  Sparkles,
  Camera,
  RefreshCw,
  Eye,
  CheckCircle2,
  Tag,
  DollarSign,
  Check,
  AlertTriangle,
  Edit3,
  Trash2,
  X,
  Save,
  Lock,
  Unlock,
  AlertCircle,
  BookmarkCheck,
  Globe,
  Plus,
  FolderPlus,
  Utensils,
  Flame,
  Crown,
  Coffee,
  Sandwich,
  Star,
  Heart,
  Pizza,
  Package,
  Salad,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Coins,
  Zap,
  Award,
  Clock,
  ToggleLeft,
  ToggleRight,
  Banknote,
  CircleDollarSign,
  BadgePercent,
  Wallet,
  Wand2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useMenuStore, defaultKosharyCustomOptions } from '@/lib/menuStore';
import { MenuItem, Category, MarketingSubFilter, DishBuilderOption, DishBuilderSettings } from '@/types';
import { ImageSelectorModal } from '@/components/admin/ImageSelectorModal';
import { officialMediaLibrary } from '@/data/restaurantMedia';

export const MenuManagementTab: React.FC = () => {
  const {
    items,
    categories,
    marketingFilters,
    customBaselineItems,
    kosharyCustomOptions,
    updateItemImage,
    updateItem,
    deleteItem,
    addItem,
    reorderCategoryItems,
    addCategory,
    updateCategory,
    deleteCategory,
    addMarketingFilter,
    updateMarketingFilter,
    deleteMarketingFilter,
    toggleMarketingFilter,
    heroFeaturedItemId,
    heroFeaturedItemIds,
    heroBadgeText,
    setHeroFeaturedDish,
    setHeroFeaturedDishes,
    dishBuilderSettings,
    toggleDishBuilderEnabled,
    addDishBuilderItem,
    updateDishBuilderItem,
    deleteDishBuilderItem,
    moveDishBuilderItem,
    reorderDishBuilderItemToPosition,
    saveAsNewDefault,
    resetToDefault,
    syncWithServer,
    saveToServer,
    isServerSyncing,
    serverSyncError,
    lastServerSyncTime
  } = useMenuStore();
  
  // Hero Dishes Customization State (1 to 4 dishes)
  const initialHeroIds = (heroFeaturedItemIds && heroFeaturedItemIds.length > 0)
    ? heroFeaturedItemIds
    : ['box-special', 'tagine-royal-mix', 'tagine-meat'];

  const [selectedHeroItems, setSelectedHeroItems] = useState<string[]>(initialHeroIds);
  const [itemToAddToHero, setItemToAddToHero] = useState<string>(items[0]?.id || 'box-special');
  const [previewActiveHeroId, setPreviewActiveHeroId] = useState<string>(initialHeroIds[0] || items[0]?.id || 'box-special');
  const [selectedHeroBadge, setSelectedHeroBadge] = useState<string>(heroBadgeText || 'جاهز للطلب فوراً 🚀');
  const [heroSaveSuccess, setHeroSaveSuccess] = useState<boolean>(false);
  const [heroErrorMessage, setHeroErrorMessage] = useState<string>('');

  useEffect(() => {
    if (heroFeaturedItemIds && heroFeaturedItemIds.length > 0) {
      setSelectedHeroItems(heroFeaturedItemIds);
      if (!heroFeaturedItemIds.includes(previewActiveHeroId)) {
        setPreviewActiveHeroId(heroFeaturedItemIds[0]);
      }
    }
    if (heroBadgeText) setSelectedHeroBadge(heroBadgeText);
  }, [heroFeaturedItemIds, heroBadgeText]);

  const PRESET_HERO_BADGES = [
    'جاهز للطلب فوراً 🚀',
    'طازج من الفرن ♨️',
    'الأعلى تقييماً ⭐',
    'طاجن الموسم 👑',
    'الخلطة الأصلية السرية ✨',
    'الأكثر مبيعاً 🏆',
    'سخن ومقرمش 🔥',
    'عرض خاص اليوم 🎁',
    'مفضل الأكيلة ❤️',
    'كشري زمان الأصيل 🍲',
  ];

  const handleAddHeroDish = () => {
    if (!itemToAddToHero) return;
    if (selectedHeroItems.includes(itemToAddToHero)) {
      setHeroErrorMessage('هذا الصنف مضاف بالفعل في الكارت الرئيسي ⚠️');
      setTimeout(() => setHeroErrorMessage(''), 3000);
      return;
    }
    if (selectedHeroItems.length >= 4) {
      setHeroErrorMessage('الحد الأقصى هو 4 أصناف فقط في الكارت الرئيسي ⚠️');
      setTimeout(() => setHeroErrorMessage(''), 3000);
      return;
    }
    const updated = [...selectedHeroItems, itemToAddToHero];
    setSelectedHeroItems(updated);
    setPreviewActiveHeroId(itemToAddToHero);
    setHeroErrorMessage('');
  };

  const handleRemoveHeroDish = (itemIdToRemove: string) => {
    if (selectedHeroItems.length <= 1) {
      setHeroErrorMessage('يجب الإبقاء على صنف واحد على الأقل في الكارت الرئيسي ⚠️');
      setTimeout(() => setHeroErrorMessage(''), 3000);
      return;
    }
    const updated = selectedHeroItems.filter(id => id !== itemIdToRemove);
    setSelectedHeroItems(updated);
    if (previewActiveHeroId === itemIdToRemove) {
      setPreviewActiveHeroId(updated[0]);
    }
    setHeroErrorMessage('');
  };

  const handleSaveHeroCustomization = () => {
    if (selectedHeroItems.length < 1) {
      setHeroErrorMessage('يجب اختيار صنف واحد على الأقل ⚠️');
      return;
    }
    setHeroFeaturedDishes(selectedHeroItems, selectedHeroBadge);
    saveToServer();
    setHeroSaveSuccess(true);
    setTimeout(() => setHeroSaveSuccess(false), 3500);
  };

  const handleManualSync = async () => {
    const res = await saveToServer();
    if (res.success) {
      setShowSuccessToast('✓ تم مزامنة وحفظ المنيو بالكامل مع السيرفر بنجاح!');
    } else {
      setShowSuccessToast('⚠️ تعذر الحفظ: ' + (res.error || 'يرجى التحقق من اتصال الإنترنت'));
    }
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  // Dish Builder Management State
  const [activeBuilderCategory, setActiveBuilderCategory] = useState<'bases' | 'proteins' | 'toppings'>('bases');
  const [newBuilderName, setNewBuilderName] = useState<string>('');
  const [newBuilderPrice, setNewBuilderPrice] = useState<string>('');
  const [builderError, setBuilderError] = useState<string>('');
  const [builderSuccessToast, setBuilderSuccessToast] = useState<string>('');
  const [editingBuilderItem, setEditingBuilderItem] = useState<{
    type: 'bases' | 'proteins' | 'toppings';
    item: DishBuilderOption;
  } | null>(null);
  const [editBuilderName, setEditBuilderName] = useState<string>('');
  const [editBuilderPrice, setEditBuilderPrice] = useState<string>('');
  const [editBuilderHasNoOptions, setEditBuilderHasNoOptions] = useState<boolean>(false);
  const [editBuilderNoOptions, setEditBuilderNoOptions] = useState<string[]>([]);
  const [newBuilderCustomNoOption, setNewBuilderCustomNoOption] = useState<string>('');

  const handleAddNewBuilderItem = () => {
    if (!isDishBuilderEditMode) {
      setIsConfirmUnlockDishBuilderModalOpen(true);
      return;
    }
    if (!newBuilderName.trim()) {
      setBuilderError('يرجى كتابة اسم البند أولاً ⚠️');
      setTimeout(() => setBuilderError(''), 3000);
      return;
    }
    const priceNum = parseFloat(newBuilderPrice) || 0;
    if (priceNum < 0) {
      setBuilderError('السعر لا يمكن أن يكون سالباً ⚠️');
      setTimeout(() => setBuilderError(''), 3000);
      return;
    }

    const newItem: DishBuilderOption = {
      id: `${activeBuilderCategory}-${Date.now()}`,
      name: newBuilderName.trim(),
      price: priceNum,
    };

    addDishBuilderItem(activeBuilderCategory, newItem);
    setNewBuilderName('');
    setNewBuilderPrice('');
    setBuilderError('');
    setBuilderSuccessToast('تمت إضافة البند بنجاح إلى تصميم الطاجن ✨');
    setTimeout(() => setBuilderSuccessToast(''), 3500);
  };

  const [editBuilderPosition, setEditBuilderPosition] = useState<number>(1);

  const handleMoveBuilderItem = (type: 'bases' | 'proteins' | 'toppings', id: string, direction: 'up' | 'down') => {
    if (!isDishBuilderEditMode) {
      setIsConfirmUnlockDishBuilderModalOpen(true);
      return;
    }
    moveDishBuilderItem(type, id, direction);
    const item = (dishBuilderSettings?.[type] || []).find(i => i.id === id);
    if (item) {
      setBuilderSuccessToast(`✓ تم تحريك "${item.name}" ${direction === 'up' ? 'للأمام ⬆️' : 'للخلف ⬇️'}`);
      setTimeout(() => setBuilderSuccessToast(''), 2500);
    }
  };

  const handleMoveBuilderItemToPosition = (type: 'bases' | 'proteins' | 'toppings', id: string, newPosition: number) => {
    if (!isDishBuilderEditMode) {
      setIsConfirmUnlockDishBuilderModalOpen(true);
      return;
    }
    if (isNaN(newPosition) || newPosition < 1) return;
    reorderDishBuilderItemToPosition(type, id, newPosition);
    const item = (dishBuilderSettings?.[type] || []).find(i => i.id === id);
    if (item) {
      setBuilderSuccessToast(`✓ تم ضبط ترتيب "${item.name}" إلى (#${newPosition})`);
      setTimeout(() => setBuilderSuccessToast(''), 2500);
    }
  };

  const handleStartEditBuilderItem = (type: 'bases' | 'proteins' | 'toppings', item: DishBuilderOption, currentPos: number) => {
    if (!isDishBuilderEditMode) {
      setIsConfirmUnlockDishBuilderModalOpen(true);
      return;
    }
    setEditingBuilderItem({ type, item });
    setEditBuilderName(item.name);
    setEditBuilderPrice(item.price.toString());
    setEditBuilderPosition(currentPos);
    setEditBuilderHasNoOptions(Boolean(item.hasNoOptions));
    setEditBuilderNoOptions(item.noOptions && item.noOptions.length > 0 ? [...item.noOptions] : []);
    setNewBuilderCustomNoOption('');
  };

  const handleSaveEditBuilderItem = () => {
    if (!editingBuilderItem) return;
    if (!editBuilderName.trim()) {
      setBuilderError('اسم البند لا يمكن أن يكون فارغاً ⚠️');
      setTimeout(() => setBuilderError(''), 3000);
      return;
    }
    const priceNum = parseFloat(editBuilderPrice) || 0;
    updateDishBuilderItem(editingBuilderItem.type, editingBuilderItem.item.id, {
      name: editBuilderName.trim(),
      price: priceNum,
      hasNoOptions: editingBuilderItem.type === 'bases' ? editBuilderHasNoOptions : undefined,
      noOptions: editingBuilderItem.type === 'bases' && editBuilderHasNoOptions ? editBuilderNoOptions : undefined,
    });
    if (editBuilderPosition && !isNaN(editBuilderPosition)) {
      reorderDishBuilderItemToPosition(editingBuilderItem.type, editingBuilderItem.item.id, editBuilderPosition);
    }
    setEditingBuilderItem(null);
    setBuilderSuccessToast('تم حفظ وتحديث البند بنجاح ✨');
    setTimeout(() => setBuilderSuccessToast(''), 3500);
  };

  const handleDeleteBuilderItem = (type: 'bases' | 'proteins' | 'toppings', id: string) => {
    if (!isDishBuilderEditMode) {
      setIsConfirmUnlockDishBuilderModalOpen(true);
      return;
    }
    const list = dishBuilderSettings?.[type] || [];
    if (list.length <= 1) {
      setBuilderError('يجب الإبقاء على خيار واحد على الأقل في هذا القسم لحماية كارت التصميم ⚠️');
      setTimeout(() => setBuilderError(''), 3500);
      return;
    }
    deleteDishBuilderItem(type, id);
    setBuilderSuccessToast('تم حذف البند من تصميم الطاجن بنجاح 🗑️');
    setTimeout(() => setBuilderSuccessToast(''), 3500);
  };
  
  // Sub-tabs: 'pricing' (قائمة الأسعار والتوفر) vs 'photos' (معرض وضبط الصور)
  const [activeSubTab, setActiveSubTab] = useState<'pricing' | 'photos'>('pricing');
  
  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({});
  
  // Modals state
  const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState<boolean>(false);
  const [isSaveDefaultModalOpen, setIsSaveDefaultModalOpen] = useState<boolean>(false);

  // Dynamic Categories & Item Addition Modals
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);

  // "الأقسام والأصناف" Hub State
  const [isExistingCategoriesOpen, setIsExistingCategoriesOpen] = useState<boolean>(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState<boolean>(false);
  const [isConfirmUnlockCategoriesModalOpen, setIsConfirmUnlockCategoriesModalOpen] = useState<boolean>(false);
  const [isDishBuilderEditMode, setIsDishBuilderEditMode] = useState<boolean>(false);
  const [isConfirmUnlockDishBuilderModalOpen, setIsConfirmUnlockDishBuilderModalOpen] = useState<boolean>(false);
  const [categoryToRename, setCategoryToRename] = useState<Category | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [renameDisplayOrder, setRenameDisplayOrder] = useState<number>(1);

  // New Category Form State
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatNameEn, setNewCatNameEn] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('Sparkles');
  const [newCatDescription, setNewCatDescription] = useState<string>('');
  const [newCatDisplayOrder, setNewCatDisplayOrder] = useState<number>(1);
  const [newCatIsKoshary, setNewCatIsKoshary] = useState<boolean>(false);
  const [newCatIsExtras, setNewCatIsExtras] = useState<boolean>(false);

  // Reorder Category helper (Move up / down or direct value change)
  const handleMoveCategory = (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const currentIndex = sorted.findIndex((c) => c.id === catId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const currentCat = sorted[currentIndex];
    const targetCat = sorted[targetIndex];

    const currentOrder = currentCat.displayOrder || (currentIndex + 1);
    const targetOrder = targetCat.displayOrder || (targetIndex + 1);

    // Swap their orders (ensure they are different)
    const newTargetOrder = currentOrder === targetOrder ? (direction === 'up' ? currentOrder + 1 : currentOrder - 1) : currentOrder;
    updateCategory(currentCat.id, { displayOrder: targetOrder });
    updateCategory(targetCat.id, { displayOrder: newTargetOrder });

    setShowSuccessToast(`✓ تم تحديث ترتيب قسم "${currentCat.name}" ${direction === 'up' ? 'للأعلى ⬆️' : 'للأسفل ⬇️'}`);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  const handleUpdateCategoryOrder = (catId: string, newOrder: number) => {
    if (isNaN(newOrder) || newOrder < 1) return;
    const cat = categories.find((c) => c.id === catId);
    updateCategory(catId, { displayOrder: newOrder });
    if (cat) {
      setShowSuccessToast(`✓ تم ضبط ترتيب قسم "${cat.name}" إلى (#${newOrder})`);
      setTimeout(() => setShowSuccessToast(null), 3000);
    }
  };

  // Reorder Item helper (Move up / down or set order within its category)
  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Get all items in the same category sorted by displayOrder
    const categoryItems = items
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const currentIndex = categoryItems.findIndex((i) => i.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categoryItems.length) return;

    const newOrderedItems = [...categoryItems];
    const [moved] = newOrderedItems.splice(currentIndex, 1);
    newOrderedItems.splice(targetIndex, 0, moved);

    reorderCategoryItems(item.categoryId, newOrderedItems.map((i) => i.id));

    setShowSuccessToast(`✓ تم تحريك صنف "${item.name}" ${direction === 'up' ? 'للأمام ⬆️' : 'للخلف ⬇️'}`);
    setTimeout(() => setShowSuccessToast(null), 2500);
  };

  const handleUpdateItemOrder = (itemId: string, newOrder: number) => {
    if (isNaN(newOrder) || newOrder < 1) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const categoryItems = items
      .filter((i) => i.categoryId === item.categoryId && i.id !== itemId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Target position in 0-based indexing
    const targetIdx = Math.max(0, Math.min(newOrder - 1, categoryItems.length));
    categoryItems.splice(targetIdx, 0, item);

    reorderCategoryItems(item.categoryId, categoryItems.map((i) => i.id));

    setShowSuccessToast(`✓ تم ضبط ترتيب صنف "${item.name}" إلى (#${targetIdx + 1})`);
    setTimeout(() => setShowSuccessToast(null), 2500);
  };

  // New Item Form State
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemOriginalPrice, setNewItemOriginalPrice] = useState<string>('');
  const [newItemDescription, setNewItemDescription] = useState<string>('');
  const [newItemImageUrl, setNewItemImageUrl] = useState<string>('/menu/koshary-box.jpg');
  const [newItemIsSpicy, setNewItemIsSpicy] = useState<boolean>(false);
  const [newItemIsPopular, setNewItemIsPopular] = useState<boolean>(false);
  const [newItemDisplayOrder, setNewItemDisplayOrder] = useState<number>(1);

  // Marketing Filters Management State ("القوائم والشارات التسويقية")
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState<boolean>(false);
  const [editingMarketingFilter, setEditingMarketingFilter] = useState<MarketingSubFilter | null>(null);
  const [filterToDelete, setFilterToDelete] = useState<MarketingSubFilter | null>(null);
  const [mfName, setMfName] = useState<string>('');
  const [mfIcon, setMfIcon] = useState<string>('⭐');
  const [mfColor, setMfColor] = useState<string>('amber');
  const [mfDescription, setMfDescription] = useState<string>('');
  const [newItemTags, setNewItemTags] = useState<string[]>([]);
  const [editItemTags, setEditItemTags] = useState<string[]>([]);

  // Full Item Edit Modal State ("فتح للتعديل")
  const [fullEditingItem, setFullEditingItem] = useState<MenuItem | null>(null);
  const [editItemName, setEditItemName] = useState<string>('');
  const [editItemCategoryId, setEditItemCategoryId] = useState<string>('');
  const [editItemPrice, setEditItemPrice] = useState<string>('');
  const [editItemOriginalPrice, setEditItemOriginalPrice] = useState<string>('');
  const [editItemDescription, setEditItemDescription] = useState<string>('');
  const [editItemImageUrl, setEditItemImageUrl] = useState<string>('/menu/koshary-box.jpg');
  const [editItemIsAvailable, setEditItemIsAvailable] = useState<boolean>(true);
  const [editItemIsSpicy, setEditItemIsSpicy] = useState<boolean>(false);
  const [editItemIsPopular, setEditItemIsPopular] = useState<boolean>(false);
  const [editItemDisplayOrder, setEditItemDisplayOrder] = useState<number>(1);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingPhotoItem, setEditingPhotoItem] = useState<MenuItem | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  // Categories sorted by displayOrder
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categories]);

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    const categoryOrderMap = new Map(categories.map((c) => [c.id, c.displayOrder || 0]));

    return items
      .filter((item) => {
        if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // If viewing all categories, group by category order first
        if (selectedCategory === 'all') {
          const catAOrder = categoryOrderMap.get(a.categoryId) || 0;
          const catBOrder = categoryOrderMap.get(b.categoryId) || 0;
          if (catAOrder !== catBOrder) return catAOrder - catBOrder;
        }
        // Then sort by item displayOrder
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
  }, [items, categories, selectedCategory, searchQuery]);

  // Start Edit Mode
  const handleStartEditMode = () => {
    // Populate draft prices from current item prices
    const initialDrafts: Record<string, number> = {};
    items.forEach((item) => {
      initialDrafts[item.id] = item.price;
    });
    setDraftPrices(initialDrafts);
    setIsEditMode(true);
  };

  // Cancel Edit Mode
  const handleCancelEditMode = () => {
    setDraftPrices({});
    setIsEditMode(false);
  };

  // Update draft price for a single item
  const handleDraftPriceChange = (itemId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setDraftPrices((prev) => ({
      ...prev,
      [itemId]: newPrice,
    }));
  };

  // Changed items count and preview
  const changedItems = useMemo(() => {
    return items.filter((item) => {
      const draft = draftPrices[item.id];
      return draft !== undefined && draft !== item.price;
    });
  }, [items, draftPrices]);

  // Execute Commit Save
  const handleConfirmSave = () => {
    // Apply all draft prices
    Object.entries(draftPrices).forEach(([itemId, newPrice]) => {
      const currentItem = items.find((i) => i.id === itemId);
      if (currentItem && currentItem.price !== newPrice) {
        updateItem(itemId, { price: newPrice });
      }
    });

    setIsConfirmSaveModalOpen(false);
    setIsEditMode(false);
    saveToServer();
    setShowSuccessToast('✓ تم حفظ وتطبيق جميع تعديلات الأسعار بنجاح ومزامنتها مع السيرفر!');
    setTimeout(() => setShowSuccessToast(null), 3500);
  };

  // Delete an item
  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    deleteItem(itemToDelete.id);
    saveToServer();
    setShowSuccessToast(`تم حذف صنف "${itemToDelete.name}" من المنيو نهائياً`);
    setItemToDelete(null);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Add a new Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newId = `cat_${Date.now()}`;
    const newCategory: Category = {
      id: newId,
      name: newCatName.trim(),
      nameEn: newCatNameEn.trim() || undefined,
      icon: newCatIcon,
      description: newCatDescription.trim() || undefined,
      displayOrder: Number(newCatDisplayOrder) || (categories.length + 1),
      isKoshary: newCatIsKoshary,
      isExtras: newCatIsExtras,
    };

    addCategory(newCategory);
    setSelectedCategory(newId);
    setNewCatName('');
    setNewCatNameEn('');
    setNewCatDescription('');
    setNewCatDisplayOrder(categories.length + 2);
    setNewCatIsKoshary(false);
    setNewCatIsExtras(false);
    setIsAddCategoryModalOpen(false);
    setShowSuccessToast(`✓ تم إضافة قسم "${newCategory.name}" بنجاح!`);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Delete a Category and its items
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const count = items.filter((i) => i.categoryId === categoryToDelete.id).length;
    deleteCategory(categoryToDelete.id);
    if (selectedCategory === categoryToDelete.id) {
      setSelectedCategory('all');
    }
    setShowSuccessToast(`تم حذف قسم "${categoryToDelete.name}" (${count} صنف) نهائياً`);
    setCategoryToDelete(null);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Add a new Menu Item
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;

    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const catId = newItemCategoryId || (categories[0]?.id || 'boxes');
    const categoryItemsCount = items.filter((i) => i.categoryId === catId).length;
    const newItem: MenuItem = {
      id: `item_${Date.now()}`,
      categoryId: catId,
      name: newItemName.trim(),
      price: priceNum,
      originalPrice: newItemOriginalPrice ? parseFloat(newItemOriginalPrice) : undefined,
      description: newItemDescription.trim(),
      imageUrl: newItemImageUrl || '/menu/koshary-box.jpg',
      isAvailable: true,
      displayOrder: Number(newItemDisplayOrder) || (categoryItemsCount + 1),
      isSpicy: newItemTags.includes('spicy') || newItemIsSpicy,
      isPopular: newItemTags.includes('popular') || newItemIsPopular,
      tags: newItemTags,
    };

    addItem(newItem);
    setSelectedCategory(catId);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemOriginalPrice('');
    setNewItemDescription('');
    setNewItemDisplayOrder(categoryItemsCount + 2);
    setNewItemIsSpicy(false);
    setNewItemIsPopular(false);
    setNewItemTags([]);
    setIsAddItemModalOpen(false);
    setShowSuccessToast(`✓ تم إضافة صنف "${newItem.name}" بنجاح!`);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Marketing Sub-filters helpers & handlers
  const renderFilterIcon = (iconName: string, sizeClass = "text-base") => {
    if (!iconName) return <span className={`${sizeClass} leading-none`}>🏷️</span>;
    if (iconName === 'Star' || iconName === 'popular') return <span className={`${sizeClass} leading-none`}>⭐</span>;
    if (iconName === 'Flame' || iconName === 'Pepper' || iconName === 'spicy') return <span className={`${sizeClass} leading-none`}>🌶️</span>;
    if (iconName === 'DollarSign' || iconName === 'Coins' || iconName === 'budget' || iconName === 'Banknote') return <span className={`${sizeClass} leading-none`}>💰</span>;
    if (iconName === 'Zap') return <span className={`${sizeClass} leading-none`}>⚡</span>;
    if (iconName === 'Crown') return <span className={`${sizeClass} leading-none`}>👑</span>;
    if (iconName === 'Sparkles') return <span className={`${sizeClass} leading-none`}>✨</span>;
    if (iconName === 'Heart') return <span className={`${sizeClass} leading-none`}>❤️</span>;
    if (iconName === 'Tag') return <span className={`${sizeClass} leading-none`}>🏷️</span>;
    if (iconName === 'Utensils') return <span className={`${sizeClass} leading-none`}>🍽️</span>;
    if (iconName === 'Award') return <span className={`${sizeClass} leading-none`}>🏆</span>;
    if (iconName === 'Clock') return <span className={`${sizeClass} leading-none`}>⏰</span>;
    return <span className={`${sizeClass} leading-none select-none`}>{iconName}</span>;
  };

  const getFilterColorClasses = (color?: string) => {
    switch (color) {
      case 'rose':
        return {
          bg: 'bg-rose-500/10 hover:bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        };
      case 'blue':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/15',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/10 hover:bg-purple-500/15',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
        };
      case 'orange':
        return {
          bg: 'bg-orange-500/10 hover:bg-orange-500/15',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          iconBg: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
        };
      case 'amber':
      default:
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        };
    }
  };

  const getFilterItemCount = (filterId: string) => {
    return items.filter((item) => {
      if (filterId === 'popular') return item.isPopular || item.tags?.includes('popular');
      if (filterId === 'spicy') return item.isSpicy || item.tags?.includes('spicy');
      if (filterId === 'budget') return item.price < 35 || item.tags?.includes('budget');
      return item.tags?.includes(filterId);
    }).length;
  };

  const handleOpenAddMarketingFilter = () => {
    setEditingMarketingFilter(null);
    setMfName('');
    setMfIcon('⭐');
    setMfColor('amber');
    setMfDescription('');
    setIsMarketingModalOpen(true);
  };

  const handleOpenEditMarketingFilter = (filter: MarketingSubFilter) => {
    setEditingMarketingFilter(filter);
    setMfName(filter.name);
    setMfIcon(filter.icon || '⭐');
    setMfColor(filter.color || 'amber');
    setMfDescription(filter.description || '');
    setIsMarketingModalOpen(true);
  };

  const handleSaveMarketingFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfName.trim()) return;

    if (editingMarketingFilter) {
      updateMarketingFilter(editingMarketingFilter.id, {
        name: mfName.trim(),
        icon: mfIcon,
        color: mfColor,
        description: mfDescription.trim() || undefined,
      });
      setShowSuccessToast(`✓ تم تحديث الشارة التسويقية "${mfName.trim()}" بنجاح!`);
    } else {
      const newId = `filter_${Date.now()}`;
      addMarketingFilter({
        id: newId,
        name: mfName.trim(),
        icon: mfIcon,
        color: mfColor,
        isEnabled: true,
        description: mfDescription.trim() || undefined,
      });
      setShowSuccessToast(`✓ تم إضافة الشارة التسويقية الجديدة "${mfName.trim()}" بنجاح!`);
    }

    setIsMarketingModalOpen(false);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  const handleConfirmDeleteMarketingFilter = () => {
    if (!filterToDelete) return;
    deleteMarketingFilter(filterToDelete.id);
    setShowSuccessToast(`✓ تم حذف الشارة التسويقية "${filterToDelete.name}" بنجاح!`);
    setFilterToDelete(null);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Rename / Edit Category Details
  const handleSaveRenameCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToRename || !renameValue.trim()) return;
    const orderNum = Number(renameDisplayOrder) || categoryToRename.displayOrder || 1;
    updateCategory(categoryToRename.id, { 
      name: renameValue.trim(),
      displayOrder: orderNum
    });
    setShowSuccessToast(`✓ تم تحديث بيانات وترتيب قسم "${renameValue.trim()}" بنجاح!`);
    setCategoryToRename(null);
    setRenameValue('');
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Open Full Item Edit Modal ("فتح للتعديل")
  const handleOpenFullEdit = (item: MenuItem) => {
    setFullEditingItem(item);
    setEditItemName(item.name);
    setEditItemCategoryId(item.categoryId);
    setEditItemPrice(item.price.toString());
    setEditItemOriginalPrice(item.originalPrice ? item.originalPrice.toString() : '');
    setEditItemDescription(item.description || '');
    setEditItemImageUrl(item.imageUrl || '/menu/koshary-box.jpg');
    setEditItemIsAvailable(item.isAvailable);
    setEditItemIsSpicy(Boolean(item.isSpicy));
    setEditItemIsPopular(Boolean(item.isPopular));
    
    // Initialize tags
    const initialTags = item.tags ? [...item.tags] : [];
    if (item.isPopular && !initialTags.includes('popular')) initialTags.push('popular');
    if (item.isSpicy && !initialTags.includes('spicy')) initialTags.push('spicy');
    setEditItemTags(initialTags);
    setEditItemDisplayOrder(item.displayOrder || 1);
  };

  // Save Full Item Edit
  const handleSaveFullEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullEditingItem || !editItemName.trim() || !editItemPrice) return;
    const priceNum = parseFloat(editItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const updates: Partial<MenuItem> = {
      name: editItemName.trim(),
      categoryId: editItemCategoryId,
      price: priceNum,
      originalPrice: editItemOriginalPrice ? parseFloat(editItemOriginalPrice) : undefined,
      description: editItemDescription.trim(),
      imageUrl: editItemImageUrl,
      isAvailable: editItemIsAvailable,
      displayOrder: Number(editItemDisplayOrder) || 1,
      isSpicy: editItemTags.includes('spicy') || editItemIsSpicy,
      isPopular: editItemTags.includes('popular') || editItemIsPopular,
      tags: editItemTags,
    };

    updateItem(fullEditingItem.id, updates);
    saveToServer();

    setDraftPrices((prev) => ({
      ...prev,
      [fullEditingItem.id]: priceNum,
    }));

    setShowSuccessToast(`✓ تم تحديث بيانات صنف "${updates.name}" بالكامل بنجاح!`);
    setFullEditingItem(null);
    setTimeout(() => setShowSuccessToast(null), 3000);
  };

  // Toggle availability
  const handleToggleAvailability = (item: MenuItem) => {
    const updatedStatus = !item.isAvailable;
    updateItem(item.id, { isAvailable: updatedStatus });
    saveToServer();
    setShowSuccessToast(
      updatedStatus
        ? `صنف "${item.name}" أصبح متوفراً الآن 🟢`
        : `تم إيقاف صنف "${item.name}" مؤقتاً 🔴`
    );
    setTimeout(() => setShowSuccessToast(null), 2500);
  };

  // Photo change handler
  const handleImageChanged = (newImageUrl: string) => {
    if (editingPhotoItem) {
      updateItemImage(editingPhotoItem.id, newImageUrl);
      setShowSuccessToast(`تم تحديث صورة "${editingPhotoItem.name}" بنجاح!`);
      setTimeout(() => setShowSuccessToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-fadeIn border border-emerald-500/50">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-xs sm:text-sm font-black">{showSuccessToast}</span>
        </div>
      )}

      {/* Sub-tab Navigation: Pricing first, then Photos */}
      <div className="flex items-center justify-center p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-xl mx-auto shadow-xl">
        <button
          type="button"
          onClick={() => setActiveSubTab('pricing')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'pricing'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>قائمة الأسعار وتوفر الأصناف</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            {items.filter((i) => i.isAvailable).length} متاح
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('photos')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'photos'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>معرض وضبط صور الأصناف</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
            {items.length}
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SUB-TAB 1: PRICING & AVAILABILITY MANAGEMENT */}
      {/* ============================================================ */}
      {activeSubTab === 'pricing' && (
        <div className="space-y-6">
          
          {/* Header Card */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 p-5 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
            {/* Top Bar of Header Card: Right Category Tag + Left Badges (وضع العرض المحمي & اعتماد كافتراضي) */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
                <DollarSign className="w-3.5 h-3.5" />
                <span>التحكم المالي وقائمة الأسعار</span>
              </div>

              {/* Top-Left Controls: الدايرة بتاع وضع العرض المحمي + اعتماد كافتراضي + مزامنة السيرفر */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isServerSyncing}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  title="مزامنة فورية للمنيو مع السيرفر لكي تظهر التعديلات على الموبايل"
                >
                  <Globe className={`w-3.5 h-3.5 ${isServerSyncing ? 'animate-spin' : ''}`} />
                  <span>{isServerSyncing ? 'جاري المزامنة...' : 'مزامنة السيرفر 🌐'}</span>
                  {lastServerSyncTime && (
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-mono">{lastServerSyncTime}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSaveDefaultModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/60 text-slate-300 hover:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="اعتماد وحفظ القائمة الحالية كوضع افتراضي رسمي جديد"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>اعتماد كافتراضي جديد</span>
                </button>

                {isEditMode ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1.5 animate-pulse shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <Unlock className="w-3 h-3" />
                    <span>وضع التعديل نشط</span>
                  </span>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-800/90 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>وضع العرض المحمي</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  قائمة الأسعار وتوفر أصناف لؤلؤة سنهور 💰📋
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  لحماية الأسعار من التعديل العرضي، اضغط على زر <strong>"تعديل الأسعار"</strong> لفتح إمكانية تعديل الأسعار وحذف الأصناف، ثم اضغط <strong>"حفظ التعديلات"</strong> لتطبيقها وتأكيدها.
                </p>
              </div>

              {/* Action Buttons: Edit Mode Trigger vs Save/Cancel */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
                {!isEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartEditMode}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>تعديل الأسعار وحذف الأصناف</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsResetConfirmModalOpen(true)}
                      className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="استعادة الأسعار الافتراضية"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>استعادة الافتراضي</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsConfirmSaveModalOpen(true)}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                      {changedItems.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-emerald-900 font-black">
                          {changedItems.length} معدل
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelEditMode}
                      className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>إلغاء التعديل</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Status notification banner when in edit mode */}
            {isEditMode && (
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    وضع التعديل مفعل: يمكنك الآن تعديل خانة السعر لكل صنف، أو حذف أي صنف عبر زر الحذف الأحمر.
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {changedItems.length} صنف تم تغيير سعره حتى الآن
                </span>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION: "الأقسام والأصناف" (CATEGORIES & ITEMS HUB)           */}
          {/* ============================================================ */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 p-5 sm:p-6 text-white shadow-xl border border-slate-800 space-y-4 relative overflow-hidden">
            {/* Top Bar: Title & Badge on Right + Lock Control on Left */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600/30 to-amber-600/30 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>الأقسام والأصناف</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                      {categories.length} قسم • {items.length} صنف
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    مركز التحكم في إنشاء وتعديل الأقسام وإضافة الأصناف للمنيو
                  </p>
                </div>
              </div>

              {/* Lock Control Button on Top-Left */}
              <div className="flex items-center gap-2">
                {!isCategoryEditMode ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmUnlockCategoriesModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="اضغط لفك القفل وتمكين تعديل أسماء الأقسام وحذفها"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>وضع حماية الأقسام (مغلق)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCategoryEditMode(false)}
                    className="px-3.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-pulse shadow-xs"
                    title="اضغط لقفل وضع التعديل وإعادة الحماية"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                    <span>وضع تعديل الأقسام نشط (انقر للقفل)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons: Add Item + Add Category + Existing Categories Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Button 1: Add New Item */}
              <button
                type="button"
                onClick={() => {
                  setNewItemCategoryId(selectedCategory !== 'all' ? selectedCategory : (categories[0]?.id || 'boxes'));
                  setIsAddItemModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة صنف جديد</span>
              </button>

              {/* Button 2: Add New Category */}
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FolderPlus className="w-4 h-4" />
                <span>إضافة قسم جديد</span>
              </button>

              {/* Button 3: Existing Categories Toggle Button */}
              <button
                type="button"
                onClick={() => setIsExistingCategoriesOpen(!isExistingCategoriesOpen)}
                className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  isExistingCategoriesOpen
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                    : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>الأقسام الموجودة</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-slate-300 font-bold border border-slate-700">
                  {categories.length}
                </span>
                {isExistingCategoriesOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 mr-1" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                )}
              </button>
            </div>

            {/* Existing Categories Panel (Visible when clicking "الأقسام الموجودة") */}
            {isExistingCategoriesOpen && (
              <div className="pt-3 border-t border-slate-800/70 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold">
                    الأقسام المسجلة حالياً في المنيو:
                  </span>
                  {isCategoryEditMode ? (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      وضع التعديل مفعل: يمكنك تعديل اسم أي قسم بالقلم ✏️ أو ضبط تصنيف (كشري 🍲 / إضافات ✨) أو حذفه 🗑️
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px]">
                      (الأقسام وتصنيفاتها محمية من التعديل — لفك القفل اضغط على زر القفل أعلى اليسار)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[...categories]
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((cat, catIdx, sortedArr) => {
                      const count = items.filter((i) => i.categoryId === cat.id).length;
                      const isFirst = catIdx === 0;
                      const isLast = catIdx === sortedArr.length - 1;

                      return (
                        <div
                          key={cat.id}
                          className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex flex-col gap-2.5 shadow-xs transition-all"
                        >
                          {/* Top Row: Category Icon & Info + Order Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400 shrink-0 text-sm font-black shadow-inner">
                                🏷️
                              </span>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
                                  <span>{cat.name}</span>
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  {count} صنف مسجل
                                </p>
                              </div>
                            </div>

                            {/* Order Badge & Fast Quick Move Buttons */}
                            <div className="flex items-center gap-1 shrink-0 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
                              <span 
                                className="text-[10px] font-black text-amber-400 font-mono tracking-tight"
                                title="ترتيب ظهور القسم في الموقع"
                              >
                                #{cat.displayOrder || (catIdx + 1)}
                              </span>
                              
                              {isCategoryEditMode && (
                                <div className="flex items-center gap-0.5 mr-1 border-r border-slate-700/80 pr-1">
                                  <button
                                    type="button"
                                    disabled={isFirst}
                                    onClick={() => handleMoveCategory(cat.id, 'up')}
                                    className={`p-1 rounded-md transition cursor-pointer ${
                                      isFirst
                                        ? 'text-slate-600 cursor-not-allowed opacity-40'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95'
                                    }`}
                                    title="تحريك القسم للأعلى (تقديم الترتيب)"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isLast}
                                    onClick={() => handleMoveCategory(cat.id, 'down')}
                                    className={`p-1 rounded-md transition cursor-pointer ${
                                      isLast
                                        ? 'text-slate-600 cursor-not-allowed opacity-40'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95'
                                    }`}
                                    title="تحريك القسم للأسفل (تأخير الترتيب)"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Section: Controls */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
                            {/* Row 1: Classification Badges / Toggles */}
                            {!isCategoryEditMode ? (
                              /* Locked / View Mode */
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-400 font-bold">
                                  التصنيف:
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {cat.isKoshary && (
                                    <span
                                      className="px-2.5 py-1 rounded-xl text-xs font-black border bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-xs"
                                      title="قسم كشري مفعل"
                                    >
                                      🍲 قسم كشري
                                    </span>
                                  )}
                                  {cat.isExtras && (
                                    <span
                                      className="px-2.5 py-1 rounded-xl text-xs font-black border bg-teal-500/15 text-teal-300 border-teal-500/30 shadow-xs"
                                      title="قسم إضافات مفعل"
                                    >
                                      ✨ قسم إضافات
                                    </span>
                                  )}
                                  {!cat.isKoshary && !cat.isExtras && (
                                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-slate-800/60 text-slate-400 border-slate-700/50">
                                      ⚪ قسم عادي
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Unlocked / Edit Mode: Large, prominent toggles with Arabic text */
                              <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                                {/* Koshary Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateCategory(cat.id, { isKoshary: !cat.isKoshary });
                                    setShowSuccessToast(`تم ${!cat.isKoshary ? 'تفعيل' : 'تعطيل'} ميزة الكشري لقسم "${cat.name}" ✨`);
                                    setTimeout(() => setShowSuccessToast(null), 3000);
                                  }}
                                  className={`py-1.5 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border active:scale-95 ${
                                    cat.isKoshary
                                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-amber-400 hover:text-amber-200'
                                  }`}
                                  title={cat.isKoshary ? 'قسم كشري مفعل - اضغط للتعطيل' : 'قسم عادي - اضغط لتفعيله ككشري'}
                                >
                                  <span>{cat.isKoshary ? '🍲 كشري: مفعل' : '⚪ كشري: غير مفعل'}</span>
                                </button>

                                {/* Extras Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateCategory(cat.id, { isExtras: !cat.isExtras });
                                    setShowSuccessToast(`تم ${!cat.isExtras ? 'تفعيل' : 'تعطيل'} تصنيف الإضافات لقسم "${cat.name}" ✨`);
                                    setTimeout(() => setShowSuccessToast(null), 3000);
                                  }}
                                  className={`py-1.5 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border active:scale-95 ${
                                    cat.isExtras
                                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-teal-400 hover:text-teal-200'
                                  }`}
                                  title={cat.isExtras ? 'قسم إضافات مفعل - اضغط للتعطيل' : 'قسم عادي - اضغط لتفعيله كإضافات'}
                                >
                                  <span>{cat.isExtras ? '✨ إضافات: مفعل' : '⚪ إضافات: غير مفعل'}</span>
                                </button>
                              </div>
                            )}

                            {/* Row 2 (When in Edit Mode): Order Input + Rename/Delete actions */}
                            {isCategoryEditMode && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-900/80 animate-in fade-in">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-400 font-bold">ترتيب بالرئيسية:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    defaultValue={cat.displayOrder || (catIdx + 1)}
                                    key={`order-${cat.id}-${cat.displayOrder}`}
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val !== cat.displayOrder) {
                                        handleUpdateCategoryOrder(cat.id, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = parseInt((e.target as HTMLInputElement).value, 10);
                                        if (!isNaN(val) && val !== cat.displayOrder) {
                                          handleUpdateCategoryOrder(cat.id, val);
                                        }
                                      }
                                    }}
                                    className="w-12 px-1.5 py-0.5 text-center text-xs font-black text-amber-300 bg-slate-900 border border-slate-700 rounded-lg focus:border-amber-400 focus:outline-none"
                                    title="اكتب رقم الترتيب واضغط Enter أو انقر بالخارج للحفظ"
                                  />
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Rename / Edit details */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCategoryToRename(cat);
                                      setRenameValue(cat.name);
                                      setRenameDisplayOrder(cat.displayOrder || (catIdx + 1));
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 transition cursor-pointer"
                                    title={`تعديل اسم وترتيب قسم "${cat.name}"`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={() => setCategoryToDelete(cat)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition cursor-pointer"
                                    title={`حذف قسم "${cat.name}"`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن صنف بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-rose-500 text-xs sm:text-sm text-white bg-slate-800/90"
                />
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-black text-slate-400">
                  عرض <strong className="text-rose-400">{filteredItems.length}</strong> صنف
                </span>
              </div>
            </div>

            {/* Category Pills with Delete Option */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                كل الأقسام ({items.length})
              </button>
              {sortedCategories.map((cat) => {
                const count = items.filter((i) => i.categoryId === cat.id).length;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing & Availability Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredItems.map((item) => {
              const currentDraftPrice = draftPrices[item.id] !== undefined ? draftPrices[item.id] : item.price;
              const isPriceModified = isEditMode && currentDraftPrice !== item.price;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-md relative ${
                    isPriceModified
                      ? 'bg-slate-900 border-amber-500/70 shadow-amber-500/10 ring-1 ring-amber-500/30'
                      : item.isAvailable
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/90 border-red-950/40 opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        unoptimized={Boolean(item.imageUrl && item.imageUrl.startsWith('data:'))}
                        className="object-cover"
                      />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-sm font-black text-white truncate">{item.name}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Order Badge & Quick Move */}
                          <div className="flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded-lg border border-slate-800">
                            {isEditMode ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-amber-400 font-mono">#</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  defaultValue={item.displayOrder || 1}
                                  key={`order-item-${item.id}-${item.displayOrder}`}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val !== item.displayOrder) {
                                      handleUpdateItemOrder(item.id, val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = parseInt((e.target as HTMLInputElement).value, 10);
                                      if (!isNaN(val) && val !== item.displayOrder) {
                                        handleUpdateItemOrder(item.id, val);
                                      }
                                    }
                                  }}
                                  className="w-8 px-1 py-0.5 text-center text-[10px] font-black text-amber-300 bg-slate-900 border border-slate-700 rounded focus:border-amber-400 focus:outline-none"
                                  title="اكتب ترتيب الصنف واضغط Enter أو انقر بالخارج"
                                />
                                <div className="flex items-center gap-0.5 mr-0.5 border-r border-slate-700/80 pr-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveItem(item.id, 'up')}
                                    className="p-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                                    title="تقديم ترتيب الصنف للأمام"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveItem(item.id, 'down')}
                                    className="p-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                                    title="تأخير ترتيب الصنف للخلف"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span
                                className="text-[10px] font-black text-amber-400 font-mono tracking-tight"
                                title="ترتيب ظهور الصنف في القسم"
                              >
                                #{item.displayOrder || 1}
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              item.isAvailable
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}
                          >
                            {item.isAvailable ? 'متوفر' : 'نفد'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Price Section & Actions */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-800/80">
                    
                    <div className="flex items-center justify-between gap-2">
                      {/* Price input or Display */}
                      {isEditMode ? (
                        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/50 shadow-xs">
                          <span className="text-xs font-bold text-amber-300">السعر:</span>
                          <input
                            type="number"
                            value={currentDraftPrice}
                            onChange={(e) => handleDraftPriceChange(item.id, Number(e.target.value))}
                            className="w-16 py-1 px-1 rounded-lg bg-slate-800 border border-amber-400/50 text-amber-300 font-black text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <span className="text-[11px] font-black text-rose-400">ج.م</span>
                          {isPriceModified && (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                              معدل
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
                          <span className="text-xs font-bold text-slate-400">السعر:</span>
                          <span className="text-sm font-black text-amber-400">{item.price}</span>
                          <span className="text-[11px] font-black text-rose-400">ج.م</span>
                        </div>
                      )}

                      {/* Availability toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                          item.isAvailable
                            ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                        }`}
                        title={item.isAvailable ? 'إيقاف إتاحة الصنف مؤقتاً' : 'إتاحة الصنف في المنيو'}
                      >
                        {item.isAvailable ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>تعطيل</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>إتاحة</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Edit Mode Actions on card: "فتح للتعديل" + "حذف الصنف" */}
                    {isEditMode && (
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenFullEdit(item)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 hover:border-amber-400 text-amber-300 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                          title="تعديل كامل تفاصيل الصنف (الاسم، السعر، القسم، الوصف، الصورة)"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>فتح للتعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          title="حذف الصنف نهائياً من المنيو"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* DEDICATED CARD: MARKETING SUB-FILTERS & BADGES HUB (كارت خاص) */}
          {/* ============================================================ */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/30 p-5 sm:p-7 shadow-2xl relative overflow-hidden mt-10">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black">
                    <Tag className="w-3.5 h-3.5" />
                    <span>القوائم التسويقية والشارات الترويجية</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span>إدارة القوائم والشارات التسويقية (الفلاتر السريعة)</span>
                    <span className="text-amber-400">🏷️✨</span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    تحكم في الفلاتر التسويقية المعروضة للزبائن أعلى المنيو (مثل الأكثر طلباً، حار مشطشط، عروض خاصة). يمكنك تغيير المسميات، تفعيل أو تعطيل أي شارة من الواجهة، أو إنشاء شارات جديدة وربط الأصناف بها.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddMarketingFilter}
                  className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>إضافة شارة تسويقية جديدة</span>
                </button>
              </div>

              {/* Marketing Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketingFilters.map((filter) => {
                  const style = getFilterColorClasses(filter.color);
                  const itemCount = getFilterItemCount(filter.id);

                  return (
                    <div
                      key={filter.id}
                      className={`rounded-2xl p-4.5 border transition-all relative flex flex-col justify-between gap-4 ${
                        filter.isEnabled
                          ? 'bg-slate-800/70 border-slate-700 hover:border-slate-600 shadow-md'
                          : 'bg-slate-900/40 border-slate-800/80 opacity-65'
                      }`}
                    >
                      {/* Top Header of each Filter Card */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${style.iconBg} shadow-inner shrink-0`}>
                              {renderFilterIcon(filter.icon, "w-5 h-5")}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                                {filter.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                معرف: #{filter.id}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 shrink-0 ${
                              filter.isEnabled
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {filter.isEnabled ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span>مفعلة بالمنيو</span>
                              </>
                            ) : (
                              <>
                                <X className="w-2.5 h-2.5 text-slate-400" />
                                <span>معطلة ومخفية</span>
                              </>
                            )}
                          </span>
                        </div>

                        {filter.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {filter.description}
                          </p>
                        )}
                      </div>

                      {/* Middle: Preview Chip & Item Count */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>مرتبط بـ <strong className="text-white">{itemCount}</strong> صنف</span>
                        </div>

                        {/* Customer Chip Preview */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-[11px] font-bold text-slate-200">
                          <span className="text-slate-400 text-[9px]">معاينة:</span>
                          <span className={style.text}>{renderFilterIcon(filter.icon, "w-3 h-3")}</span>
                          <span>{filter.name}</span>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-2.5 border-t border-slate-800 flex items-center gap-2">
                        {/* Toggle Enable/Disable */}
                        <button
                          type="button"
                          onClick={() => {
                            toggleMarketingFilter(filter.id);
                            setShowSuccessToast(
                              filter.isEnabled
                                ? `تم تعطيل شارة "${filter.name}" وإخفاؤها من واجهة الزبائن.`
                                : `تم تفعيل شارة "${filter.name}" وإظهارها للزبائن!`
                            );
                            setTimeout(() => setShowSuccessToast(null), 3000);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            filter.isEnabled
                              ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border-slate-700 hover:border-red-500/40'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                          }`}
                          title={filter.isEnabled ? 'تعطيل إظهار هذه الشارة للزبائن' : 'تفعيل وإظهار هذه الشارة للزبائن'}
                        >
                          {filter.isEnabled ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-400" />
                              <span>تعطيل</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>تفعيل</span>
                            </>
                          )}
                        </button>

                        {/* Edit Filter */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditMarketingFilter(filter)}
                          className="py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          title="تعديل اسم الشارة، أيقونتها أو لونها"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        {/* Delete Filter */}
                        <button
                          type="button"
                          onClick={() => setFilterToDelete(filter)}
                          className="py-1.5 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition flex items-center justify-center cursor-pointer active:scale-95"
                          title="حذف هذه الشارة التسويقية"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 4: HERO FEATURED DISH & BADGE CUSTOMIZER            */}
          {/* ============================================================ */}
          {(() => {
            const heroPreviewDish = items.find(i => i.id === previewActiveHeroId) || items.find(i => i.id === selectedHeroItems[0]) || items[0];

            return (
              <div className="rounded-3xl bg-slate-900/90 border-2 border-amber-500/30 p-5 sm:p-7 shadow-2xl relative overflow-hidden text-white space-y-6">
                
                {/* Subtle Ambient Glow */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />

                {/* Section Header */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black">
                      <Crown className="w-3.5 h-3.5" />
                      <span>الكارت التفاعلي الرئيسي بالواجهة</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <span>تخصيص طبق الواجهة والكارت الرئيسي</span>
                      <span className="text-amber-400">🌟🍲</span>
                    </h3>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      تحكم بالأصناف المعروضة في الكارت التفاعلي بالصفحة الرئيسية (من 1 إلى 4 أصناف)، وبإمكانك حذف أو إضافة أي صنف، وتحديد العبارة التسويقية الجذابة أسفل الصورة.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {heroSaveSuccess && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black animate-pulse flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تم الحفظ والتطبيق فوراً!</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Content Grid: Controls on right, Live Preview on left */}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Controls Column (7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* 1. Select & Add Dishes to Hero */}
                    <div className="p-4.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-amber-400" />
                          <span>1. اختيار وإضافة أصناف الكارت الرئيسي:</span>
                        </label>
                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                          selectedHeroItems.length >= 4
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {selectedHeroItems.length} من 4 أصناف
                        </span>
                      </div>

                      {/* Dropdown with Add Button */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={itemToAddToHero}
                          onChange={(e) => setItemToAddToHero(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none transition"
                        >
                          {sortedCategories.map((cat) => {
                            const catItems = items
                              .filter(i => i.categoryId === cat.id)
                              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                            if (catItems.length === 0) return null;
                            return (
                              <optgroup key={cat.id} label={`─── ${cat.name} ───`}>
                                {catItems.map((item) => {
                                  const isAlreadyAdded = selectedHeroItems.includes(item.id);
                                  return (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({item.price} ج.م) {isAlreadyAdded ? '✓ (مضاف حالياً)' : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          onClick={handleAddHeroDish}
                          disabled={selectedHeroItems.length >= 4 || selectedHeroItems.includes(itemToAddToHero)}
                          className={`px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                            selectedHeroItems.length >= 4 || selectedHeroItems.includes(itemToAddToHero)
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md active:scale-95'
                          }`}
                        >
                          <Plus className="w-4 h-4 text-slate-950" />
                          <span>إضافة للكارت</span>
                        </button>
                      </div>

                      {/* Error / Notification Message */}
                      {heroErrorMessage && (
                        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>{heroErrorMessage}</span>
                        </div>
                      )}

                      {/* Added Dishes List (replacing "اختيار سريع") */}
                      <div className="space-y-2 pt-2 border-t border-slate-700/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5" />
                            <span>الأصناف المضافة للكارت ({selectedHeroItems.length} من أصل 4):</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            (على الأقل 1 • حد أقصى 4)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedHeroItems.map((itemId, idx) => {
                            const dish = items.find(i => i.id === itemId);
                            if (!dish) return null;
                            const isPreview = previewActiveHeroId === itemId;
                            const canDelete = selectedHeroItems.length > 1;

                            return (
                              <div
                                key={itemId}
                                onClick={() => setPreviewActiveHeroId(itemId)}
                                className={`rounded-2xl p-2.5 border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                  isPreview
                                    ? 'bg-amber-500/15 border-amber-400/80 shadow-md ring-1 ring-amber-400/60'
                                    : 'bg-slate-900/80 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                                    {dish.imageUrl ? (
                                      <Image src={dish.imageUrl} alt={dish.name} fill className="object-cover" />
                                    ) : (
                                      <Utensils className="w-4 h-4 text-slate-500 m-auto" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-black text-white truncate">
                                      {dish.name}
                                    </h5>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                      <span className="text-rose-400">{dish.price} ج.م</span>
                                      {isPreview && (
                                        <span className="text-amber-300 font-black">• معروض 👁️</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveHeroDish(itemId);
                                  }}
                                  disabled={!canDelete}
                                  title={canDelete ? "حذف هذا الصنف من الكارت" : "لا يمكن الحذف (يجب بقاء صنف واحد على الأقل)"}
                                  className={`p-1.5 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer ${
                                    canDelete
                                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 active:scale-90'
                                      : 'bg-slate-800/30 text-slate-600 border border-slate-800 cursor-not-allowed'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 2. Marketing Phrase & Emojis */}
                    <div className="p-4.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>2. العبارة التسويقية أسفل صورة الصنف:</span>
                        </label>
                        <span className="text-[11px] text-amber-400 font-bold">
                          10 عبارات جاهزة بالرموز
                        </span>
                      </div>

                      {/* 10 Preset Phrases Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                        {PRESET_HERO_BADGES.map((badge) => {
                          const isSelected = selectedHeroBadge === badge;
                          return (
                            <button
                              key={badge}
                              type="button"
                              onClick={() => setSelectedHeroBadge(badge)}
                              className={`px-3 py-2 rounded-xl text-xs font-black text-right transition border flex items-center justify-between gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400'
                                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span className="truncate">{badge}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Input */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-black text-slate-300 block">
                          أو اكتب عبارتك الخاصة مع أي إيموجي تحبه:
                        </label>
                        <input
                          type="text"
                          value={selectedHeroBadge}
                          onChange={(e) => setSelectedHeroBadge(e.target.value)}
                          placeholder="اكتب هنا العبارة التي تريد ظهورها أسفل صورة الكارت..."
                          className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-black text-xs sm:text-sm focus:border-amber-400 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Action Save Button */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveHeroCustomization}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-red-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-xl shadow-rose-900/40 transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                      >
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <span>حفظ وتطبيق على الكارت الرئيسي بالواجهة 🚀</span>
                      </button>

                      {heroSaveSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>تم تطبيق الصنف والعبارة بنجاح! يمكنك زيارة الصفحة الرئيسية لمشاهدتها الآن.</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Live Preview Column (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-rose-400" />
                        <span>معاينة حية كما تظهر للزبائن:</span>
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        مباشر
                      </span>
                    </div>

                    {/* Preview Ruby Box */}
                    <div className="rounded-3xl bg-gradient-to-b from-rose-900 via-red-950 to-slate-950 border-2 border-rose-700/50 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
                      
                      {/* Preview Switcher Tabs matching Home Page Hero */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pb-2 border-b border-white/10">
                        <span className="text-[11px] font-black text-rose-200 ml-1">أصناف الكارت:</span>
                        {selectedHeroItems.map((itemId) => {
                          const dish = items.find(i => i.id === itemId);
                          if (!dish) return null;
                          const isCurrent = (previewActiveHeroId === itemId) || (!previewActiveHeroId && selectedHeroItems[0] === itemId);
                          return (
                            <button
                              key={itemId}
                              type="button"
                              onClick={() => setPreviewActiveHeroId(itemId)}
                              className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-white text-rose-900 shadow-md scale-105'
                                  : 'bg-black/30 hover:bg-black/40 text-white/80 border border-white/10'
                              }`}
                            >
                              {dish.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dish Floating Stage */}
                      <div className="flex flex-col items-center justify-center pt-1">
                        <div className="relative group cursor-pointer">
                          {/* Rotating Dashed Orbit Ring */}
                          <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-300/40 animate-spin-slow pointer-events-none" />
                          
                          {/* Glow */}
                          <div className="absolute -inset-2 bg-gradient-to-tr from-amber-400/30 to-white/20 rounded-full blur-xl pointer-events-none" />

                          {/* Round Image Container */}
                          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden p-1 bg-white shadow-2xl border-4 border-white/90">
                            {heroPreviewDish?.imageUrl ? (
                              <Image
                                src={heroPreviewDish.imageUrl}
                                alt={heroPreviewDish.name}
                                fill
                                className="object-cover rounded-full"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                                <Utensils className="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          {/* Floating Badge with Selected Text */}
                          <div className="absolute -bottom-2.5 right-1/2 translate-x-1/2 bg-white text-rose-900 text-[11px] font-black px-3.5 py-1 rounded-full shadow-lg border border-white flex items-center gap-1 whitespace-nowrap animate-bounce-short">
                            <span>{selectedHeroBadge || 'جاهز للطلب فوراً 🚀'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dish Information */}
                      <div className="space-y-1.5 pt-2">
                        <h4 className="text-lg sm:text-xl font-black text-white">
                          {heroPreviewDish?.name || 'اختر طبقاً'}
                        </h4>
                        <p className="text-xs text-rose-200/80 line-clamp-2 leading-relaxed font-medium px-2">
                          {heroPreviewDish?.description || 'وصف الصنف...'}
                        </p>
                      </div>

                      {/* Price Strip */}
                      <div className="p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between px-4">
                        <span className="text-xs font-bold text-rose-200">السعر المعروض:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">
                            {heroPreviewDish?.price || 0}
                          </span>
                          <span className="text-xs font-black text-amber-300">
                            ج.م
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-bold">
                        💡 هذا الصنف سيظهر فوراً كطبق الواجهة عند زيارة أي زبون للموقع.
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            );
          })()}

          {/* ============================================================ */}
          {/* SECTION 5: DISH BUILDER SETTINGS (صمّم طاجنك الملوكي) */}
          {/* ============================================================ */}
          <div className="rounded-3xl bg-slate-900 border border-amber-500/30 p-5 sm:p-7 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            {/* Header & Master Toggle */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black mb-2">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>استوديو الطواجن الملوكية</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>إدارة بنود كارت "صمّم طاجنك الملوكي" 🍲</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  تحكم كامل في بنود الطاجن (الأساس، البروتينات، المقرمشات) مع تحديد الأسعار، وإمكانية تفعيل أو إخفاء ميزة تصميم الطاجن بالكامل من الصفحة الرئيسية.
                </p>
              </div>

              {/* Master Visibility Switch & Lock Control Button */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Lock Control Button */}
                <div>
                  {!isDishBuilderEditMode ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmUnlockDishBuilderModalOpen(true)}
                      className="px-3.5 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                      title="اضغط لفك القفل وتفعيل تعديل وترتيب بنود الطاجن"
                    >
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>وضع حماية كارت الطاجن (مغلق)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsDishBuilderEditMode(false)}
                      className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer animate-pulse shadow-xs whitespace-nowrap"
                      title="اضغط لقفل التعديل وإعادة وضع الحماية"
                    >
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>وضع تعديل الطاجن نشط (انقر للقفل)</span>
                    </button>
                  )}
                </div>

                {/* Master Visibility Switch */}
                <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-400">حالة الكارت:</div>
                    <div className={`text-xs font-black ${dishBuilderSettings?.isEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {dishBuilderSettings?.isEnabled ? 'مفعّل بالرئيسية 🟢' : 'معطّل ومخفي 🔴'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isDishBuilderEditMode) {
                        setIsConfirmUnlockDishBuilderModalOpen(true);
                        return;
                      }
                      toggleDishBuilderEnabled();
                    }}
                    className={`px-3.5 py-2 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                      dishBuilderSettings?.isEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                    title={!isDishBuilderEditMode ? 'يتطلب فك القفل أولاً لتغيير حالة الكارت' : ''}
                  >
                    {dishBuilderSettings?.isEnabled ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-200" />
                        <span>إخفاء</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>إظهار</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Toasts */}
            {builderSuccessToast && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{builderSuccessToast}</span>
              </div>
            )}

            {builderError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{builderError}</span>
              </div>
            )}

            {/* Category Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => { setActiveBuilderCategory('bases'); setBuilderError(''); }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  activeBuilderCategory === 'bases'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🍲 الأساس (Bases)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeBuilderCategory === 'bases' ? 'bg-amber-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}>
                  {dishBuilderSettings?.bases?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveBuilderCategory('proteins'); setBuilderError(''); }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  activeBuilderCategory === 'proteins'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>🥩 البروتين والخلطة (Proteins)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeBuilderCategory === 'proteins' ? 'bg-amber-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}>
                  {dishBuilderSettings?.proteins?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveBuilderCategory('toppings'); setBuilderError(''); }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  activeBuilderCategory === 'toppings'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>✨ المقرمشات والإضافات (Toppings)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeBuilderCategory === 'toppings' ? 'bg-amber-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}>
                  {dishBuilderSettings?.toppings?.length || 0}
                </span>
              </button>
            </div>

            {/* List of current items in active category */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                <span>
                  البنود الحالية في قسم ({
                    activeBuilderCategory === 'bases' ? 'الأساس 🍲' : activeBuilderCategory === 'proteins' ? 'البروتين والخلطة 🥩' : 'المقرمشات والإضافات ✨'
                  }):
                </span>
                <span className="text-[11px] text-amber-400 font-bold">الحد الأدنى بند واحد لكل قسم للحفاظ على عمل الكارت</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(dishBuilderSettings?.[activeBuilderCategory] || []).map((builderItem, index) => {
                  const list = dishBuilderSettings?.[activeBuilderCategory] || [];
                  const isFirst = index === 0;
                  const isLast = index === list.length - 1;

                  return (
                    <div
                      key={builderItem.id}
                      className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 hover:border-amber-500/40 transition flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Order Badge & Reorder Controls */}
                        {!isDishBuilderEditMode ? (
                          <button
                            type="button"
                            onClick={() => setIsConfirmUnlockDishBuilderModalOpen(true)}
                            className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-amber-500/50 transition shrink-0 cursor-pointer group/badge"
                            title="الكارت محمي - اضغط لفك القفل وإمكانية تعديل الترتيب"
                          >
                            <span className="text-xs font-mono text-amber-400 font-black">#{index + 1}</span>
                            <Lock className="w-3 h-3 text-slate-500 group-hover/badge:text-amber-400 transition" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-slate-950/80 px-1.5 py-1 rounded-xl border border-slate-800 shrink-0">
                            <span className="text-[10px] font-bold text-amber-400 font-mono">#</span>
                            <input
                              type="number"
                              min="1"
                              max={list.length}
                              defaultValue={index + 1}
                              key={`builder-order-${builderItem.id}-${index}-${list.length}`}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val !== index + 1) {
                                  handleMoveBuilderItemToPosition(activeBuilderCategory, builderItem.id, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                                  if (!isNaN(val) && val !== index + 1) {
                                    handleMoveBuilderItemToPosition(activeBuilderCategory, builderItem.id, val);
                                  }
                                }
                              }}
                              className="w-8 px-1 py-0.5 text-center text-[10px] font-black text-amber-300 bg-slate-900 border border-slate-700 rounded focus:border-amber-400 focus:outline-none"
                              title="اكتب ترتيب البند واضغط Enter أو انقر بالخارج"
                            />
                            <div className="flex items-center gap-0.5 mr-0.5 border-r border-slate-700/80 pr-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveBuilderItem(activeBuilderCategory, builderItem.id, 'up')}
                                disabled={isFirst}
                                className={`p-0.5 rounded text-slate-300 transition ${
                                  isFirst
                                    ? 'opacity-20 cursor-not-allowed'
                                    : 'hover:text-white hover:bg-slate-800 active:scale-95 cursor-pointer'
                                }`}
                                title="تقديم ترتيب البند للأمام"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveBuilderItem(activeBuilderCategory, builderItem.id, 'down')}
                                disabled={isLast}
                                className={`p-0.5 rounded text-slate-300 transition ${
                                  isLast
                                    ? 'opacity-20 cursor-not-allowed'
                                    : 'hover:text-white hover:bg-slate-800 active:scale-95 cursor-pointer'
                                }`}
                                title="تأخير ترتيب البند للخلف"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="text-sm font-black text-white truncate" title={builderItem.name}>
                            {builderItem.name}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                            <div className="flex items-center gap-1 text-amber-400">
                              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{builderItem.price > 0 ? `+${builderItem.price} ج.م` : 'مشمول / مجاني'}</span>
                            </div>
                            {activeBuilderCategory === 'bases' && builderItem.hasNoOptions && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black">
                                قائمة بدون: مفعّلة ({builderItem.noOptions?.length || 0})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditBuilderItem(activeBuilderCategory, builderItem, index + 1)}
                          className={`p-2 rounded-xl transition cursor-pointer ${
                            !isDishBuilderEditMode
                              ? 'bg-slate-800/80 text-slate-400 hover:text-amber-300 hover:bg-slate-700/80'
                              : 'bg-slate-700/80 hover:bg-amber-500 hover:text-slate-950 text-slate-300'
                          }`}
                          title={!isDishBuilderEditMode ? 'الكارت محمي - اضغط لفك القفل والتعديل' : 'تعديل الاسم أو السعر أو الترتيب'}
                        >
                          {!isDishBuilderEditMode ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Edit3 className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBuilderItem(activeBuilderCategory, builderItem.id)}
                          disabled={isDishBuilderEditMode && list.length <= 1}
                          className={`p-2 rounded-xl transition cursor-pointer ${
                            !isDishBuilderEditMode
                              ? 'bg-slate-800/80 text-slate-500 hover:text-rose-300 hover:bg-slate-700/80'
                              : list.length <= 1
                              ? 'opacity-30 cursor-not-allowed text-slate-500 bg-slate-800'
                              : 'bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-800/40'
                          }`}
                          title={!isDishBuilderEditMode ? 'الكارت محمي - اضغط لفك القفل والحذف' : list.length <= 1 ? 'لا يمكن حذف البند الأخير' : 'حذف البند'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Item Strip */}
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
              <div className="text-xs font-black text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>إضافة بند جديد لقسم ({
                    activeBuilderCategory === 'bases' ? 'الأساس 🍲' : activeBuilderCategory === 'proteins' ? 'البروتين والخلطة 🥩' : 'المقرمشات والإضافات ✨'
                  })</span>
                </div>
                {!isDishBuilderEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmUnlockDishBuilderModalOpen(true)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer transition"
                    title="انقر لفك القفل"
                  >
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>الكارت مقفل (انقر لفك القفل)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-[2]">
                  <input
                    type="text"
                    value={newBuilderName}
                    onChange={(e) => setNewBuilderName(e.target.value)}
                    placeholder={
                      activeBuilderCategory === 'bases'
                        ? 'مثال: مكرونة قلم بالصلصة الحارة'
                        : activeBuilderCategory === 'proteins'
                        ? 'مثال: استربس دجاج مقرمش'
                        : 'مثال: هالابينو مشطشط ومخلل'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-amber-400 focus:outline-none placeholder:text-slate-500"
                  />
                </div>

                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newBuilderPrice}
                      onChange={(e) => setNewBuilderPrice(e.target.value)}
                      placeholder="السعر الإضافي (ج.م)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-amber-400 focus:outline-none placeholder:text-slate-500 pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400">
                      ج.م
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewBuilderItem}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة البند</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 2: PHOTOS MANAGEMENT */}
      {/* ============================================================ */}
      {activeSubTab === 'photos' && (
        <div className="space-y-6">
          {/* Official Media Library Showcase Card */}
          <div className="rounded-3xl bg-gradient-to-r from-rose-950 via-red-950 to-slate-900 p-5 sm:p-7 text-white shadow-xl border border-rose-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-black mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>مكتبة صور لؤلؤة سنهور المجهزة</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  معرض وضبط صور أصناف المنيو 🍲🖼️
                </h2>
                <p className="text-xs sm:text-sm text-rose-200/80 mt-1 max-w-2xl">
                  تم ضبط وتجهيز صور الأصناف الحقيقية بأبعاد موحدة (800x800) مع تأثيرات حركية تفاعلية عند الوقوف. يمكنك تعيين أي صورة رسمية لأي صنف، أو رفع صورة خارجية من جهازك أو الإنترنت.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(true)}
                className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>

            {/* Quick Preview of the official photos */}
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-xs font-bold text-rose-300 mb-3 flex items-center gap-2">
                <span>الصور الأساسية المجهزة في النظام ({officialMediaLibrary.length} أصناف):</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {officialMediaLibrary.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 p-2 text-center transition hover:border-rose-400 hover:bg-white/10"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-black/30">
                      <Image
                        src={photo.url}
                        alt={photo.title}
                        fill
                        className="object-cover transform group-hover:scale-110 group-hover:rotate-1 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1.5">
                        <span className="text-[10px] font-black text-amber-300">متحركة</span>
                      </div>
                    </div>
                    <h4 className="text-[11px] font-black text-white truncate">{photo.title}</h4>
                    <p className="text-[9px] text-rose-300 truncate mt-0.5">{photo.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن صنف بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-rose-500 text-xs sm:text-sm text-white bg-slate-800/90"
                />
              </div>

              <span className="text-xs font-black text-slate-400 self-end sm:self-center">
                عرض <strong className="text-rose-400">{filteredItems.length}</strong> من أصل {items.length} صنف
              </span>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                كل الأقسام ({items.length})
              </button>
              {sortedCategories.map((cat) => {
                const count = items.filter((i) => i.categoryId === cat.id).length;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid for Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredItems.map((item) => {
              const isOfficial = officialMediaLibrary.some((m) => m.url === item.imageUrl);

              return (
                <div
                  key={item.id}
                  className="group bg-slate-900/90 rounded-3xl p-4 border border-slate-800 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 mb-3.5">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        unoptimized={Boolean(item.imageUrl && item.imageUrl.startsWith('data:'))}
                        className="object-cover transform group-hover:scale-105 group-hover:rotate-0.5 transition-transform duration-500"
                      />

                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950/80 text-amber-400 border border-slate-800 backdrop-blur-xs shadow-xs font-mono">
                          #{item.displayOrder || 1}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                        {isOfficial ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> صورة المطعم الأساسية
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600/90 text-white backdrop-blur-xs shadow-xs flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" /> صورة مخصصة
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setEditingPhotoItem(item)}
                          className="px-4 py-2 rounded-xl bg-white text-slate-900 font-black text-xs shadow-lg hover:scale-105 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-rose-600" />
                          <span>تغيير الصورة</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {item.name}
                        </h3>
                        <span className="text-sm font-black text-rose-400 shrink-0">
                          {item.price} ج.م
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold truncate max-w-[150px]">
                      {item.imageUrl.startsWith('/menu/') ? 'صورة محلية مضبوطة' : 'صورة خارجية'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setEditingPhotoItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>تغيير الصورة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CONFIRM SAVE CHANGES MODAL                          */}
      {/* ============================================================ */}
      {isConfirmSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsConfirmSaveModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10">
            
            {/* Glowing Icon */}
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Save className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                تأكيد حفظ وتطبيق الأسعار الجديدة 💰✨
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                هل أنت متأكد من حفظ التعديلات؟ سيتم تحديث الأسعار فوراً في النظام وعكسها للزبائن مباشرة في المنيو والسلة.
              </p>
            </div>

            {/* Changed items summary card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-right space-y-2 text-xs max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-400 font-bold">
                <span>الصنف</span>
                <span>السعر القديم ← الجديد</span>
              </div>
              {changedItems.length === 0 ? (
                <p className="text-center py-2 text-slate-500 font-bold">لم تقم بتغيير أي أسعار بعد</p>
              ) : (
                changedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <span className="text-white font-black truncate max-w-[170px]">{item.name}</span>
                    <span className="font-bold shrink-0">
                      <span className="text-slate-400 line-through mr-1">{item.price} ج.م</span>
                      <span className="text-emerald-400 font-black">← {draftPrices[item.id]} ج.م</span>
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSaveModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                إلغاء ومتابعة التعديل
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد الحفظ والتطبيق</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CONFIRM DELETE ITEM MODAL                           */}
      {/* ============================================================ */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setItemToDelete(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10">
            
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
              <Trash2 className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                تأكيد حذف الصنف من المنيو نهائياً ⚠️
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                هل أنت متأكد من حذف هذا الصنف من قائمة المطعم؟ لن يظهر للزبائن بعد الآن.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-right space-y-2 text-xs flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                <Image src={itemToDelete.imageUrl} alt={itemToDelete.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-white text-sm truncate">{itemToDelete.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{itemToDelete.description}</p>
                <span className="text-rose-400 font-bold text-xs mt-1 block">{itemToDelete.price} ج.م</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                تراجع وإلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف الصنف</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CONFIRM RESET DEFAULTS MODAL                        */}
      {/* ============================================================ */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsResetConfirmModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10">
            
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <RefreshCw className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                استعادة القائمة والأسعار الافتراضية 🔄
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {customBaselineItems && customBaselineItems.length > 0
                  ? `سيتم استرجاع المنيو إلى الوضع الافتراضي المعتمد الذي قمت بحفظه (${customBaselineItems.length} صنف). هل ترغب في المتابعة؟`
                  : 'سيؤدي هذا الإجراء إلى إعادة جميع أسعار الأصناف، الصور، وحالات التوفر إلى الوضع الأصلي للمطعم. هل ترغب في المتابعة؟'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                إلغاء وتراجع
              </button>

              <button
                type="button"
                onClick={() => {
                  resetToDefault();
                  setIsResetConfirmModalOpen(false);
                  setIsEditMode(false);
                  setDraftPrices({});
                  setShowSuccessToast('تمت استعادة القائمة والأسعار الافتراضية بنجاح!');
                  setTimeout(() => setShowSuccessToast(null), 3000);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>نعم، استعد الافتراضي</span>
              </button>
            </div>

          </div>
        </div>
      )}

            {/* ============================================================ */}
      {/* MODAL 5: ADD NEW CATEGORY MODAL                              */}
      {/* ============================================================ */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsAddCategoryModalOpen(false)}
          />

          <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 z-10 text-white overflow-hidden my-auto">
            
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    إضافة قسم جديد للمنيو 🗂️✨
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    أنشئ قسماً جديداً لتصنيف وتنظيم الأصناف بداخله
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    اسم القسم بالعربي <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عروض التوفير، مقبلات وسلطات، وجبات عائلية..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 bg-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    الاسم بالإنجليزية <span className="text-slate-500 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Family Meals, Offers..."
                    value={newCatNameEn}
                    onChange={(e) => setNewCatNameEn(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 bg-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    أيقونة القسم
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-2 rounded-2xl bg-slate-950 border border-slate-800">
                    {[
                      { id: 'Crown', icon: <Crown className="w-4 h-4" />, label: 'تاج' },
                      { id: 'Flame', icon: <Flame className="w-4 h-4" />, label: 'طاجن' },
                      { id: 'Sparkles', icon: <Sparkles className="w-4 h-4" />, label: 'ميكس' },
                      { id: 'Sandwich', icon: <Sandwich className="w-4 h-4" />, label: 'سندوتش' },
                      { id: 'PlusCircle', icon: <PlusCircle className="w-4 h-4" />, label: 'إضافات' },
                      { id: 'Coffee', icon: <Coffee className="w-4 h-4" />, label: 'مشروبات' },
                      { id: 'Utensils', icon: <Utensils className="w-4 h-4" />, label: 'وجبات' },
                      { id: 'Star', icon: <Star className="w-4 h-4" />, label: 'مميز' },
                      { id: 'Heart', icon: <Heart className="w-4 h-4" />, label: 'محبوب' },
                      { id: 'Pizza', icon: <Pizza className="w-4 h-4" />, label: 'بيتزا' },
                      { id: 'Package', icon: <Package className="w-4 h-4" />, label: 'بوكس' },
                      { id: 'Salad', icon: <Salad className="w-4 h-4" />, label: 'سلطة' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewCatIcon(item.id)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          newCatIcon === item.id
                            ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title={item.label}
                      >
                        {item.icon}
                        <span className="text-[9px] font-bold">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    وصف مختصر للقسم <span className="text-slate-500 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="وصف مختصر يظهر للزبائن..."
                    value={newCatDescription}
                    onChange={(e) => setNewCatDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 bg-slate-800 text-white resize-none"
                  />
                </div>

                {/* Koshary Category Toggle */}
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>هل هذا القسم كشري؟ 🍲</span>
                    </div>
                    <div className="text-[11px] text-amber-200/70 font-medium leading-relaxed">
                      تفعيل قلم الملاحظات وقائمة (بدون بصل، بدون شطة...) لأصناف هذا القسم في السلة للزبائن
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewCatIsKoshary(!newCatIsKoshary)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      newCatIsKoshary
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {newCatIsKoshary ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-slate-950" />
                        <span>كشري: مفعل 🟢</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-500" />
                        <span>كشري: غير مفعل ⚪</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Extras Category Toggle */}
                <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                      <span>هل هذا القسم إضافات؟ ✨</span>
                    </div>
                    <div className="text-[11px] text-teal-200/70 font-medium leading-relaxed">
                      تحديد هذا القسم كقسم إضافات ومقبلات جانبية لطلبات الزبائن
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewCatIsExtras(!newCatIsExtras)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      newCatIsExtras
                        ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {newCatIsExtras ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-slate-950" />
                        <span>إضافات: مفعل 🟢</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-500" />
                        <span>إضافات: غير مفعل ⚪</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Display Order in Add Category Modal */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="block text-xs font-black text-amber-300">
                      ترتيب ظهور القسم في الموقع 🔢
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium">
                      الرقم الأصغر يظهر أولاً في شريط الأقسام والصفحة الرئيسية
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-400">#</span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={newCatDisplayOrder}
                      onChange={(e) => setNewCatDisplayOrder(parseInt(e.target.value, 10) || 1)}
                      className="w-16 px-3 py-1.5 text-center rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-900 text-amber-300 font-black text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>إنشاء القسم الآن 🚀</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: DELETE CATEGORY CONFIRMATION MODAL                   */}
      {/* ============================================================ */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setCategoryToDelete(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
            
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
              <Trash2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                حذف قسم "{categoryToDelete.name}" نهائياً 🗑️⚠️
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {(() => {
                  const count = items.filter((i) => i.categoryId === categoryToDelete.id).length;
                  if (count > 0) {
                    return `تنبيه هام: يحتوي هذا القسم على (${count}) صنف حالياً. سيؤدي حذفه إلى حذف جميع هذه الأصناف التابعة له نهائياً من المنيو.`;
                  }
                  return 'هذا القسم فارغ ولا يحتوي على أصناف حالياً. هل أنت متأكد من حذفه نهائياً؟';
                })()}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                تراجع وإلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف القسم</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 7: ADD NEW ITEM TO MENU MODAL                          */}
      {/* ============================================================ */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsAddItemModalOpen(false)}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 z-10 text-white overflow-hidden my-auto">
            
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    إضافة صنف جديد إلى المنيو 🍲✨
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    أدخل بيانات الصنف الجديد وحدد القسم المناسب له
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    اسم الصنف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: طاجن لحمة موزة بلدي"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    القسم التابع له <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newItemCategoryId || (sortedCategories[0]?.id || '')}
                    onChange={(e) => setNewItemCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-800 text-white cursor-pointer"
                  >
                    {sortedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    السعر (ج.م) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    placeholder="مثال: 60"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-800 text-white font-black"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    قبل الخصم <span className="text-slate-500 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    placeholder="مثال: 75"
                    value={newItemOriginalPrice}
                    onChange={(e) => setNewItemOriginalPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                    <span>ترتيب الظهور بالقسم</span>
                    <span className="text-[10px] text-amber-400 font-mono">#</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    value={newItemDisplayOrder}
                    onChange={(e) => setNewItemDisplayOrder(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-800 text-white font-mono font-bold text-center"
                    title="ترتيب ظهور هذا الصنف في قسمه بالمنيو"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  وصف الصنف والمكونات
                </label>
                <textarea
                  rows={2}
                  placeholder="وصف مشهي للمكونات والتتبيلة..."
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-800 text-white resize-none"
                />
              </div>

              {/* Image Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  صورة الصنف
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shrink-0 bg-slate-950">
                    <Image
                      src={newItemImageUrl || '/menu/koshary-box.jpg'}
                      alt="معاينة"
                      fill
                      className="object-cover"
                      unoptimized={Boolean(newItemImageUrl && newItemImageUrl.startsWith('data:'))}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="أو ضع رابط صورة مخصص هنا..."
                    value={newItemImageUrl}
                    onChange={(e) => setNewItemImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 text-xs bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Quick Pick from Official Photos */}
                <p className="text-[11px] text-slate-400 mb-1 font-bold">
                  أو اختر صورة سريعة من صور المطعم الجاهزة:
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {officialMediaLibrary.slice(0, 10).map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => setNewItemImageUrl(media.url)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        newItemImageUrl === media.url
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40 scale-105'
                          : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                      }`}
                      title={media.title}
                    >
                      <Image
                        src={media.url}
                        alt={media.title}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Marketing Badges / Tags */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <label className="block text-slate-300 font-bold text-xs">
                  الشارات والقوائم التسويقية المرتبطة بالصنف:
                </label>
                <div className="flex flex-wrap gap-2">
                  {marketingFilters.map((mf) => {
                    const isChecked = newItemTags.includes(mf.id) || (mf.id === 'popular' && newItemIsPopular) || (mf.id === 'spicy' && newItemIsSpicy);
                    return (
                      <button
                        key={mf.id}
                        type="button"
                        onClick={() => {
                          let nextTags: string[];
                          if (isChecked) {
                            nextTags = newItemTags.filter((t) => t !== mf.id);
                            if (mf.id === 'popular') setNewItemIsPopular(false);
                            if (mf.id === 'spicy') setNewItemIsSpicy(false);
                          } else {
                            nextTags = [...newItemTags, mf.id];
                            if (mf.id === 'popular') setNewItemIsPopular(true);
                            if (mf.id === 'spicy') setNewItemIsSpicy(true);
                          }
                          setNewItemTags(nextTags);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {renderFilterIcon(mf.icon, "w-3.5 h-3.5")}
                        <span>{mf.name}</span>
                        {isChecked && <Check className="w-3 h-3 text-amber-400 mr-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الصنف للمنيو 🚀</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 8: CONFIRM UNLOCK CATEGORIES EDIT MODE                */}
      {/* ============================================================ */}
      {isConfirmUnlockCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsConfirmUnlockCategoriesModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <Unlock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                تأكيد فك قفل تعديل وإدارة الأقسام 🔓⚠️
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                هل أنت متأكد من رغبتك في تفعيل وضع تعديل الأقسام؟ سيمكنك هذا الإجراء من تعديل أسماء الأقسام الحالية أو حذفها نهائياً من المنيو.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmUnlockCategoriesModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                إلغاء وتراجع
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCategoryEditMode(true);
                  setIsExistingCategoriesOpen(true);
                  setIsConfirmUnlockCategoriesModalOpen(false);
                  setShowSuccessToast('تم فك القفل بنجاح — يمكنك الآن تعديل أو حذف الأقسام 🔓');
                  setTimeout(() => setShowSuccessToast(null), 3500);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Unlock className="w-4 h-4" />
                <span>نعم، فك القفل والتعديل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 8.5: CONFIRM UNLOCK DISH BUILDER STUDIO                */}
      {/* ============================================================ */}
      {isConfirmUnlockDishBuilderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsConfirmUnlockDishBuilderModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <Unlock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                تأكيد فك قفل كارت تصميم الطاجن 🔓🍲
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                هل أنت متأكد من رغبتك في فك حماية كارت "صمّم طاجنك الملوكي"؟ سيمكنك هذا الإجراء من إعادة ترتيب البنود وتقديمها وتأخيرها، وتعديل الأسعار والخيارات، أو إضافة بنود جديدة وتغيير حالة ظهور الكارت.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmUnlockDishBuilderModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                إلغاء وتراجع
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDishBuilderEditMode(true);
                  setIsConfirmUnlockDishBuilderModalOpen(false);
                  setShowSuccessToast('تم فك قفل كارت تصميم الطاجن بنجاح — يمكنك الآن التعديل والترتيب 🔓✨');
                  setTimeout(() => setShowSuccessToast(null), 3500);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Unlock className="w-4 h-4" />
                <span>نعم، فك القفل والتعديل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 9: RENAME CATEGORY MODAL                               */}
      {/* ============================================================ */}
      {categoryToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setCategoryToRename(null)}
          />

          <div className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 z-10 text-white overflow-hidden my-auto">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تعديل اسم القسم ✏️
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    الاسم الحالي: {categoryToRename.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCategoryToRename(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameCategory} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  اسم القسم الجديد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white font-black"
                  placeholder="أدخل الاسم الجديد للقسم..."
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span>ترتيب ظهور القسم في الرئيسية 🔢</span>
                  <span className="text-[10px] text-amber-400 font-normal">الأصغر يظهر أولاً</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400">#</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={renameDisplayOrder}
                    onChange={(e) => setRenameDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-amber-300 font-black text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCategoryToRename(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديل 💾</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 10: FULL ITEM EDIT MODAL ("فتح للتعديل")              */}
      {/* ============================================================ */}
      {fullEditingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setFullEditingItem(null)}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 z-10 text-white overflow-hidden my-auto">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    تعديل بيانات وتفاصيل الصنف 🍲✏️
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يمكنك تعديل أي تفاصيل للصنف كما لو كنت تنشئه من جديد
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFullEditingItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFullEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    اسم الصنف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    القسم التابع له <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editItemCategoryId}
                    onChange={(e) => setEditItemCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white cursor-pointer"
                  >
                    {sortedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    السعر (ج.م) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white font-black"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    قبل الخصم <span className="text-slate-500 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={editItemOriginalPrice}
                    onChange={(e) => setEditItemOriginalPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                    <span>ترتيب الظهور بالقسم</span>
                    <span className="text-[10px] text-amber-400 font-mono">#</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editItemDisplayOrder}
                    onChange={(e) => setEditItemDisplayOrder(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white font-mono font-bold text-center"
                    title="ترتيب ظهور هذا الصنف في قسمه بالمنيو"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  وصف الصنف والمكونات
                </label>
                <textarea
                  rows={2}
                  value={editItemDescription}
                  onChange={(e) => setEditItemDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white resize-none"
                />
              </div>

              {/* Image Selection */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  صورة الصنف
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/50 shrink-0 bg-slate-950">
                    <Image
                      src={editItemImageUrl || '/menu/koshary-box.jpg'}
                      alt="معاينة"
                      fill
                      className="object-cover"
                      unoptimized={Boolean(editItemImageUrl && editItemImageUrl.startsWith('data:'))}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="رابط صورة مخصص..."
                    value={editItemImageUrl}
                    onChange={(e) => setEditItemImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 text-xs bg-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <p className="text-[11px] text-slate-400 mb-1 font-bold">
                  أو اختر بنقرة واحدة من مكتبة صور المطعم الرسمية:
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {officialMediaLibrary.slice(0, 10).map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => setEditItemImageUrl(media.url)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        editItemImageUrl === media.url
                          ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                          : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                      }`}
                      title={media.title}
                    >
                      <Image
                        src={media.url}
                        alt={media.title}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick tags and Marketing Filters */}
              <div className="space-y-3 pt-1 border-t border-slate-800">
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editItemIsAvailable}
                      onChange={(e) => setEditItemIsAvailable(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-300">متوفر للطلب 🟢</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold text-xs">
                    الشارات والقوائم التسويقية المرتبطة بالصنف:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {marketingFilters.map((mf) => {
                      const isChecked = editItemTags.includes(mf.id) || (mf.id === 'popular' && editItemIsPopular) || (mf.id === 'spicy' && editItemIsSpicy);
                      return (
                        <button
                          key={mf.id}
                          type="button"
                          onClick={() => {
                            let nextTags: string[];
                            if (isChecked) {
                              nextTags = editItemTags.filter((t) => t !== mf.id);
                              if (mf.id === 'popular') setEditItemIsPopular(false);
                              if (mf.id === 'spicy') setEditItemIsSpicy(false);
                            } else {
                              nextTags = [...editItemTags, mf.id];
                              if (mf.id === 'popular') setEditItemIsPopular(true);
                              if (mf.id === 'spicy') setEditItemIsSpicy(true);
                            }
                            setEditItemTags(nextTags);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            isChecked
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {renderFilterIcon(mf.icon, "w-3.5 h-3.5")}
                          <span>{mf.name}</span>
                          {isChecked && <Check className="w-3 h-3 text-amber-400 mr-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFullEditingItem(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتحديث بيانات الصنف 💾</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {isSaveDefaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsSaveDefaultModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/90 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center space-y-5 animate-in zoom-in-95 duration-200 z-10">
            
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <BookmarkCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                اعتماد الوضع الحالي كافتراضي جديد 📌✨
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                سيتم حفظ جميع الأسعار، الصور، وتوفر الأصناف الحالية ({items.length} صنف) كنقطة استعادة رسمية للمطعم. عند الضغط على "استعادة الافتراضي" مستقبلاً، سيتم الرجوع إلى هذا الوضع تحديداً.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSaveDefaultModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                إلغاء وتراجع
              </button>

              <button
                type="button"
                onClick={() => {
                  saveAsNewDefault();
                  setIsSaveDefaultModalOpen(false);
                  setShowSuccessToast('✓ تم اعتماد القائمة الحالية بنجاح كوضع افتراضي رسمي للمطعم!');
                  setTimeout(() => setShowSuccessToast(null), 3500);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>نعم، اعتمد كافتراضي</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 11: ADD / EDIT MARKETING SUB-FILTER MODAL               */}
      {/* ============================================================ */}
      {isMarketingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsMarketingModalOpen(false)}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200 z-10 text-white overflow-hidden my-auto">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {editingMarketingFilter ? 'تعديل الشارة التسويقية 🏷️✏️' : 'إضافة شارة تسويقية جديدة 🏷️✨'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingMarketingFilter
                      ? 'تعديل اسم الشارة، أيقونتها أو لونها المميز'
                      : 'أنشئ شارة تسويقية جديدة لتظهر كفلتر سريع للزبائن أعلى المنيو'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMarketingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMarketingFilter} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  اسم الشارة / الفلتر التسويقي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وجبات التوفير، عروض اليوم، حار نار..."
                  value={mfName}
                  onChange={(e) => setMfName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white font-bold"
                />
              </div>

              {/* Emoji & Icon Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-bold">
                    الرمز التعبيري للشارة (اختر من الرموز أو الصق إيموجي):
                  </label>
                  <span className="text-[11px] text-amber-400 font-bold">
                    المحدد: {renderFilterIcon(mfIcon, "text-lg")}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-800 rounded-2xl bg-slate-950/50">
                  {[
                    { id: '🌶️', name: 'فلفل حار' },
                    { id: '⭐', name: 'الأكثر طلباً' },
                    { id: '💰', name: 'أقل من 35 ج' },
                    { id: '🔥', name: 'شعلة نار' },
                    { id: '👑', name: 'تاج ملوكي' },
                    { id: '✨', name: 'تألق وجديد' },
                    { id: '❤️', name: 'مفضل الزبائن' },
                    { id: '⚡', name: 'برق وسريع' },
                    { id: '🏷️', name: 'عروض وخصم' },
                    { id: '🍽️', name: 'طعام ومائدة' },
                    { id: '🍲', name: 'كشري وطواجن' },
                    { id: '🏆', name: 'وسام الشيف' },
                    { id: '🪙', name: 'عملة توفير' },
                    { id: '💵', name: 'كاش ونقود' },
                    { id: '⏰', name: 'لفترة محدودة' },
                    { id: '🎁', name: 'هدية وعرض' },
                    { id: '💥', name: 'عرض قنبلة' },
                    { id: '💯', name: 'مضمون 100%' },
                  ].map((iconObj) => (
                    <button
                      key={iconObj.id}
                      type="button"
                      onClick={() => setMfIcon(iconObj.id)}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition cursor-pointer ${
                        mfIcon === iconObj.id
                          ? 'bg-amber-500/25 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xl leading-none">{iconObj.id}</span>
                      <span className="text-[10px] font-bold truncate max-w-full">{iconObj.name}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">أو اكتب/الصق رمزك:</span>
                  <input
                    type="text"
                    placeholder="مثال: 🌶️ أو ⭐ أو 💰"
                    value={mfIcon}
                    onChange={(e) => setMfIcon(e.target.value)}
                    className="w-28 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-center font-bold text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  اللون المميز:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'amber', name: 'ذهبي', bg: 'bg-amber-500' },
                    { id: 'rose', name: 'وردي/ناري', bg: 'bg-rose-500' },
                    { id: 'emerald', name: 'أخضر', bg: 'bg-emerald-500' },
                    { id: 'blue', name: 'أزرق', bg: 'bg-blue-500' },
                    { id: 'purple', name: 'بنفسجي', bg: 'bg-purple-500' },
                    { id: 'orange', name: 'برتقالي', bg: 'bg-orange-500' },
                  ].map((colorObj) => (
                    <button
                      key={colorObj.id}
                      type="button"
                      onClick={() => setMfColor(colorObj.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer ${
                        mfColor === colorObj.id
                          ? 'border-white ring-2 ring-white/50 bg-slate-800'
                          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${colorObj.bg} shrink-0`} />
                      <span className="text-[11px] font-bold text-slate-200">{colorObj.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  الوصف (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: يظهر للأصناف المميزة التي تقدم بأسعار خاصة"
                  value={mfDescription}
                  onChange={(e) => setMfDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500 bg-slate-800 text-white"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">معاينة كيف تظهر للزبون:</span>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-white text-slate-800 border border-rose-200 shadow-sm text-xs">
                  {renderFilterIcon(mfIcon, "w-3.5 h-3.5")}
                  <span>{mfName.trim() || 'اسم الشارة'}</span>
                </div>
              </div>

              </div>

              {/* Fixed Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMarketingModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-600/30 transition cursor-pointer active:scale-95"
                >
                  {editingMarketingFilter ? 'حفظ التعديلات' : 'إضافة الشارة الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 11: CONFIRM DELETE MARKETING FILTER MODAL               */}
      {/* ============================================================ */}
      {filterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setFilterToDelete(null)}
          />

          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-red-500/40 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 z-10 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  حذف الشارة التسويقية نهائياً ⚠️
                </h3>
                <p className="text-xs text-slate-400">
                  هل أنت متأكد من حذف الشارة التسويقية <strong className="text-red-300 font-bold">"{filterToDelete.name}"</strong>؟
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-red-950/40 p-3 rounded-xl border border-red-800/40 leading-relaxed">
              سيتم إزالة هذا الفلتر من واجهة الزبائن، ولن يتم حذف الأصناف المرتبطة به.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFilterToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                إلغاء وتراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMarketingFilter}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف الشارة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Selector Modal */}
      {editingPhotoItem && (
        <ImageSelectorModal
          isOpen={Boolean(editingPhotoItem)}
          onClose={() => setEditingPhotoItem(null)}
          itemName={editingPhotoItem.name}
          currentImageUrl={editingPhotoItem.imageUrl}
          onSelectImage={handleImageChanged}
        />
      )}

      {/* Edit Dish Builder Item Modal */}
      {editingBuilderItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-black text-amber-400 uppercase">
                  {editingBuilderItem.type === 'bases' ? 'الأساس 🍲' : editingBuilderItem.type === 'proteins' ? 'البروتين والخلطة 🥩' : 'المقرمشات والإضافات ✨'}
                </span>
                <h3 className="text-lg font-black text-white">تعديل بند الطاجن</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBuilderItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم البند:
                </label>
                <input
                  type="text"
                  value={editBuilderName}
                  onChange={(e) => setEditBuilderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  السعر الإضافي (ج.م):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editBuilderPrice}
                    onChange={(e) => setEditBuilderPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:border-amber-400 focus:outline-none pl-12"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400">
                    ج.م
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>ترتيب ظهور البند في القسم:</span>
                  <span className="text-[10px] text-amber-400 font-mono">#</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={dishBuilderSettings?.[editingBuilderItem.type]?.length || 1}
                  value={editBuilderPosition}
                  onChange={(e) => setEditBuilderPosition(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-black text-center focus:border-amber-400 focus:outline-none"
                  title="ترتيب ظهور هذا البند في كارت تصميم الطاجن"
                />
              </div>

              {/* خاص بقسم الأساس فقط: تفعيل ظهور قائمة "بدون" وتحديد بنودها */}
              {editingBuilderItem.type === 'bases' && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <div>
                      <span className="text-xs font-black text-white block">
                        تفعيل ظهور قائمة «بدون» 🍲
                      </span>
                      <span className="text-[11px] text-slate-400">
                        إتاحة تحديد خيارات استبعاد مكونات لهذا الأساس عند اختياره في الكارت
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !editBuilderHasNoOptions;
                        setEditBuilderHasNoOptions(nextState);
                        // If turning on and empty, populate with default koshary options
                        if (nextState && editBuilderNoOptions.length === 0) {
                          const pool = (kosharyCustomOptions && kosharyCustomOptions.length > 0)
                            ? kosharyCustomOptions
                            : defaultKosharyCustomOptions;
                          setEditBuilderNoOptions([...pool]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        editBuilderHasNoOptions
                          ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {editBuilderHasNoOptions ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>مفعّل</span>
                        </>
                      ) : (
                        <span>معطّل</span>
                      )}
                    </button>
                  </div>

                  {/* إذا تم تفعيل ظهور قائمة بدون: تحديد ما يظهر فيها */}
                  {editBuilderHasNoOptions && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-amber-300 block">
                          حدد البنود المتاحة للاختيار في «بدون»:
                        </label>
                        <span className="text-[10px] text-slate-400">
                          ({editBuilderNoOptions.length} محددة)
                        </span>
                      </div>

                      {/* مجموعة الخيارات السريعة للاختيار منها */}
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {Array.from(
                          new Set([
                            ...((kosharyCustomOptions && kosharyCustomOptions.length > 0) ? kosharyCustomOptions : defaultKosharyCustomOptions),
                            ...editBuilderNoOptions
                          ])
                        ).map((opt) => {
                          const isSelected = editBuilderNoOptions.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setEditBuilderNoOptions(editBuilderNoOptions.filter(o => o !== opt));
                                } else {
                                  setEditBuilderNoOptions([...editBuilderNoOptions, opt]);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* إضافة بند مخصص إضافي لقائمة بدون لهذا الأساس */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                        <input
                          type="text"
                          value={newBuilderCustomNoOption}
                          onChange={(e) => setNewBuilderCustomNoOption(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = newBuilderCustomNoOption.trim();
                              if (val && !editBuilderNoOptions.includes(val)) {
                                setEditBuilderNoOptions([...editBuilderNoOptions, val]);
                                setNewBuilderCustomNoOption('');
                              }
                            }
                          }}
                          placeholder="أضف بند بدون مخصص (مثال: بدون حمص...)"
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-amber-400 focus:outline-none placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = newBuilderCustomNoOption.trim();
                            if (val && !editBuilderNoOptions.includes(val)) {
                              setEditBuilderNoOptions([...editBuilderNoOptions, val]);
                              setNewBuilderCustomNoOption('');
                            }
                          }}
                          disabled={!newBuilderCustomNoOption.trim()}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingBuilderItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEditBuilderItem}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
