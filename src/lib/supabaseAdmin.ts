import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { extractSecretsFromSettings, pickPublicSettings, stripSecretsFromSettings, type ExtractedSecrets } from '@/lib/publicSettings';

function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  return rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

let cachedServiceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  if (cachedServiceClient) return cachedServiceClient;
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

export function isServiceSupabaseConfigured(): boolean {
  return Boolean(getServiceSupabase());
}

export async function adminGetSettings(): Promise<Record<string, any> | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();
    if (error) {
      console.warn('[adminGetSettings]', error.message);
      return null;
    }
    return data?.data && typeof data.data === 'object' ? data.data : null;
  } catch (err: any) {
    console.warn('[adminGetSettings]', err?.message || err);
    return null;
  }
}

export async function adminSaveSettings(menuData: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase service role is not configured' };
  }
  const { error } = await supabase.from('restaurant_settings').upsert(
    {
      id: 'main',
      data: menuData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminGetSecrets(): Promise<Record<string, string>> {
  const supabase = getServiceSupabase();
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('restaurant_secrets')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();
    if (error) {
      console.warn('[adminGetSecrets]', error.message);
      return {};
    }
    return data?.data && typeof data.data === 'object' ? data.data : {};
  } catch (err: any) {
    console.warn('[adminGetSecrets]', err?.message || err);
    return {};
  }
}

export async function adminSaveSecrets(
  patch: Record<string, string | undefined> | ExtractedSecrets
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase service role is not configured' };
  }
  const current = await adminGetSecrets();
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'string' && value.trim()) {
      next[key] = value.trim();
    }
  }
  const { error } = await supabase.from('restaurant_secrets').upsert(
    {
      id: 'main',
      data: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

let didMigratePublicSecrets = false;

export async function migratePublicSecrets(): Promise<void> {
  if (didMigratePublicSecrets) return;
  const settings = await adminGetSettings();
  if (!settings) return;
  const extracted = extractSecretsFromSettings(settings);
  if (extracted.monitorPassword || extracted.instanceId || extracted.apiToken) {
    await adminSaveSecrets(extracted);
    await adminSaveSettings(stripSecretsFromSettings(settings));
  }
  didMigratePublicSecrets = true;
}

export function getPublicMenuPayload(settings: Record<string, any> | null) {
  return pickPublicSettings(settings);
}

export async function getMonitorPassword(): Promise<string> {
  const fromEnv = process.env.MONITOR_PASSWORD?.trim() || '';
  if (fromEnv) return fromEnv;
  await migratePublicSecrets();
  const secrets = await adminGetSecrets();
  return secrets.monitorPassword?.trim() || '';
}

export async function getWhatsAppGatewayCredentials(override?: {
  instanceId?: string;
  apiToken?: string;
}): Promise<{ instanceId: string; apiToken: string }> {
  const envId = process.env.ULTRAMSG_INSTANCE_ID?.trim() || '';
  const envToken = process.env.ULTRAMSG_TOKEN?.trim() || '';
  if (envId && envToken) {
    return { instanceId: envId, apiToken: envToken };
  }
  const overrideId = override?.instanceId?.trim() || '';
  const overrideToken = override?.apiToken?.trim() || '';
  if (overrideId && overrideToken) {
    return { instanceId: overrideId, apiToken: overrideToken };
  }
  await migratePublicSecrets();
  const secrets = await adminGetSecrets();
  return {
    instanceId: secrets.instanceId?.trim() || '',
    apiToken: secrets.apiToken?.trim() || '',
  };
}
