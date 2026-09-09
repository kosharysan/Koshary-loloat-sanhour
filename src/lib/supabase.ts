import { createClient } from '@supabase/supabase-js';
import { ClosedShift } from '@/types';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const LOCAL_ORDERS_KEY = 'loloat_sanhour_admin_orders';

export async function saveOrderToSupabase(orderData: any) {
  // Always persist to local admin orders cache first
  try {
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const newOrder = {
        ...orderData,
        id: orderData.id || `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([newOrder, ...existing]));
    }
  } catch (e) {
    console.error('Error caching order locally:', e);
  }

  if (!isSupabaseConfigured || !supabase) {
    console.log('[Supabase Mock] Order recorded locally:', orderData);
    return { success: true, mode: 'local' };
  }

  try {
    const { data, error } = await supabase.from('orders').insert([orderData]).select();
    if (error) throw error;
    return { success: true, mode: 'live', data };
  } catch (err: any) {
    console.error('[Supabase Live Error]', err.message);
    return { success: false, error: err.message };
  }
}

const LOCAL_STATUS_OVERRIDES_KEY = 'loloat_orders_status_overrides';
const LOCAL_DELETED_ORDERS_KEY = 'loloat_deleted_order_ids';

export async function fetchOrdersFromDatabase() {
  // 1. Gather local status overrides and deleted IDs
  let localOverrides: Record<string, string> = {};
  let localDeletedIds: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      localOverrides = JSON.parse(localStorage.getItem(LOCAL_STATUS_OVERRIDES_KEY) || '{}');
      localDeletedIds = JSON.parse(localStorage.getItem(LOCAL_DELETED_ORDERS_KEY) || '[]');
    } catch {}
  }

  // 2. Fetch from Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      // Parallel fetch orders and restaurant_settings overrides
      const [ordersRes, settingsData] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        fetchRestaurantSettingsFromDb().catch(() => null)
      ]);

      const cloudOverrides: Record<string, string> = settingsData?.orderStatusOverrides || {};
      const cloudDeleted: string[] = settingsData?.deletedOrderIds || [];
      const combinedOverrides = { ...cloudOverrides, ...localOverrides };
      const combinedDeleted = new Set([...cloudDeleted, ...localDeletedIds]);

      if (!ordersRes.error && Array.isArray(ordersRes.data)) {
        const merged = ordersRes.data
          .filter(order => !combinedDeleted.has(order.id))
          .map(order => {
            const override = combinedOverrides[order.id];
            return override ? { ...order, status: override } : order;
          });
        return merged;
      }
    } catch (e) {
      console.warn('Fallback to local orders cache:', e);
    }
  }

  // 3. Fallback to local storage cache
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const deletedSet = new Set(localDeletedIds);
      const merged = local
        .filter((o: any) => !deletedSet.has(o.id))
        .map((o: any) => {
          const override = localOverrides[o.id];
          return override ? { ...o, status: override } : o;
        });
      return merged;
    } catch {
      return [];
    }
  }
  return [];
}

export async function updateOrderStatusInDb(orderId: string, newStatus: string) {
  // 1. Instantly save in local overrides cache
  if (typeof window !== 'undefined') {
    try {
      const overrides = JSON.parse(localStorage.getItem(LOCAL_STATUS_OVERRIDES_KEY) || '{}');
      overrides[orderId] = newStatus;
      localStorage.setItem(LOCAL_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));

      const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const updated = orders.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
    } catch {}
  }

  // 2. Persist to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      // a. Direct table update
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

      // b. Cloud shared settings sync (has UPDATE policy allowed across all clients)
      const settings = await fetchRestaurantSettingsFromDb();
      if (settings) {
        const cloudOverrides = settings.orderStatusOverrides || {};
        cloudOverrides[orderId] = newStatus;
        await saveRestaurantSettingsToDb({
          ...settings,
          orderStatusOverrides: cloudOverrides
        });
      }
    } catch (e) {
      console.warn('Failed to update Supabase status:', e);
    }
  }
}

export async function deleteOrderFromDatabase(orderId: string) {
  // 1. Save deleted ID in local cache
  if (typeof window !== 'undefined') {
    try {
      const deleted = JSON.parse(localStorage.getItem(LOCAL_DELETED_ORDERS_KEY) || '[]');
      if (!deleted.includes(orderId)) {
        localStorage.setItem(LOCAL_DELETED_ORDERS_KEY, JSON.stringify([...deleted, orderId]));
      }
      const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const updated = orders.filter((o: any) => o.id !== orderId);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
    } catch {}
  }

  // 2. Delete from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('orders').delete().eq('id', orderId);

      const settings = await fetchRestaurantSettingsFromDb();
      if (settings) {
        const cloudDeleted = settings.deletedOrderIds || [];
        if (!cloudDeleted.includes(orderId)) {
          await saveRestaurantSettingsToDb({
            ...settings,
            deletedOrderIds: [...cloudDeleted, orderId]
          });
        }
      }
    } catch (e: any) {
      console.warn('Failed to delete order from Supabase:', e.message);
    }
  }
}

export async function fetchRestaurantSettingsFromDb(): Promise<any | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('data, updated_at')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Could not fetch restaurant settings:', error.message);
      return null;
    }
    return data ? data.data : null;
  } catch (err: any) {
    console.warn('[Supabase Settings Fetch Error]:', err.message);
    return null;
  }
}

export async function saveRestaurantSettingsToDb(menuData: any): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }
  try {
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert({
        id: 'main',
        data: menuData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Settings Save Error]:', err.message);
    return { success: false, error: err.message };
  }
}

const LOCAL_SHIFTS_KEY = 'loloat_closed_shifts';
const LOCAL_CURRENT_SHIFT_START_KEY = 'loloat_current_shift_start';
const LOCAL_CURRENT_SHIFT_NUM_KEY = 'loloat_current_shift_number';
const LOCAL_ARCHIVED_ORDER_IDS_KEY = 'loloat_archived_order_ids';

export async function fetchShiftsData(): Promise<{
  closedShifts: ClosedShift[];
  currentShiftStartTime: string;
  currentShiftNumber: number;
  archivedOrderIds: string[];
}> {
  let localShifts: ClosedShift[] = [];
  let localStartTime = '';
  let localShiftNumber = 1;
  let localArchivedIds: string[] = [];

  if (typeof window !== 'undefined') {
    try {
      localShifts = JSON.parse(localStorage.getItem(LOCAL_SHIFTS_KEY) || '[]');
      localStartTime = localStorage.getItem(LOCAL_CURRENT_SHIFT_START_KEY) || '';
      localShiftNumber = Number(localStorage.getItem(LOCAL_CURRENT_SHIFT_NUM_KEY)) || (localShifts.length + 1);
      localArchivedIds = JSON.parse(localStorage.getItem(LOCAL_ARCHIVED_ORDER_IDS_KEY) || '[]');
    } catch {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const settings = await fetchRestaurantSettingsFromDb();
      if (settings) {
        const cloudShifts = settings.closedShifts || [];
        const cloudStartTime = settings.currentShiftStartTime || '';
        const cloudShiftNumber = Number(settings.currentShiftNumber) || (cloudShifts.length + 1);
        const cloudArchivedIds = settings.archivedOrderIds || [];

        // دمج الورديات بدون تكرار
        const shiftsMap = new Map<string, ClosedShift>();
        [...cloudShifts, ...localShifts].forEach((s: ClosedShift) => {
          if (s && s.id) shiftsMap.set(s.id, s);
        });
        const combinedShifts = Array.from(shiftsMap.values()).sort((a, b) => 
          new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
        );

        const combinedArchived = Array.from(new Set([...cloudArchivedIds, ...localArchivedIds]));
        const effectiveStartTime = cloudStartTime || localStartTime || new Date().toISOString();
        const effectiveShiftNum = Math.max(cloudShiftNumber, localShiftNumber, combinedShifts.length + 1);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(combinedShifts));
            localStorage.setItem(LOCAL_CURRENT_SHIFT_START_KEY, effectiveStartTime);
            localStorage.setItem(LOCAL_CURRENT_SHIFT_NUM_KEY, String(effectiveShiftNum));
            localStorage.setItem(LOCAL_ARCHIVED_ORDER_IDS_KEY, JSON.stringify(combinedArchived));
          } catch {}
        }

        return {
          closedShifts: combinedShifts,
          currentShiftStartTime: effectiveStartTime,
          currentShiftNumber: effectiveShiftNum,
          archivedOrderIds: combinedArchived,
        };
      }
    } catch (e) {
      console.warn('Failed to fetch shifts from Supabase:', e);
    }
  }

  const effectiveStartTime = localStartTime || new Date().toISOString();
  if (typeof window !== 'undefined' && !localStartTime) {
    try {
      localStorage.setItem(LOCAL_CURRENT_SHIFT_START_KEY, effectiveStartTime);
    } catch {}
  }

  return {
    closedShifts: localShifts,
    currentShiftStartTime: effectiveStartTime,
    currentShiftNumber: localShiftNumber,
    archivedOrderIds: localArchivedIds,
  };
}

export async function closeShiftInDatabase(
  newClosedShift: ClosedShift,
  newShiftStartTime: string,
  newShiftNumber: number,
  newArchivedOrderIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // 1. تحديث التخزين المحلي فوراً
  if (typeof window !== 'undefined') {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_SHIFTS_KEY) || '[]');
      const updatedShifts = [newClosedShift, ...existing.filter((s: any) => s.id !== newClosedShift.id)];
      localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(updatedShifts));
      localStorage.setItem(LOCAL_CURRENT_SHIFT_START_KEY, newShiftStartTime);
      localStorage.setItem(LOCAL_CURRENT_SHIFT_NUM_KEY, String(newShiftNumber));
      localStorage.setItem(LOCAL_ARCHIVED_ORDER_IDS_KEY, JSON.stringify(newArchivedOrderIds));
    } catch (e) {
      console.error('Failed to cache closed shift locally:', e);
    }
  }

  // 2. المزامنة مع Supabase السحابي
  if (isSupabaseConfigured && supabase) {
    try {
      const settings = (await fetchRestaurantSettingsFromDb()) || {};
      const cloudShifts = settings.closedShifts || [];
      const updatedShifts = [newClosedShift, ...cloudShifts.filter((s: any) => s.id !== newClosedShift.id)];

      await saveRestaurantSettingsToDb({
        ...settings,
        closedShifts: updatedShifts,
        currentShiftStartTime: newShiftStartTime,
        currentShiftNumber: newShiftNumber,
        archivedOrderIds: newArchivedOrderIds,
      });
      return { success: true };
    } catch (err: any) {
      console.error('Failed to save closed shift to Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

