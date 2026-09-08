import { createClient } from '@supabase/supabase-js';

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

export async function fetchOrdersFromDatabase() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Fallback to local orders cache:', e);
    }
  }

  // Fallback to local storage cache
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      return local;
    } catch {
      return [];
    }
  }
  return [];
}

export async function updateOrderStatusInDb(orderId: string, newStatus: string) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    } catch (e) {
      console.warn('Failed to update Supabase status:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const orders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
      const updated = orders.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated));
    } catch {}
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

