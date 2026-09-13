import https from 'node:https';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { extractSecretsFromSettings, pickPublicSettings, stripSecretsFromSettings, type ExtractedSecrets } from '@/lib/publicSettings';

function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  return rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

function createSupabaseServerFetch() {
  let allowedHost = '';
  try {
    allowedHost = new URL(getSupabaseUrl()).host;
  } catch {
    allowedHost = '';
  }

  const agent = new https.Agent({ rejectUnauthorized: false });

  return (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(href);

    if (!allowedHost || parsed.host !== allowedHost) {
      return fetch(input, init);
    }

    return new Promise<Response>((resolve, reject) => {
      const method = (init?.method || 'GET').toUpperCase();
      const headers: Record<string, string> = {};
      const incoming = init?.headers;
      if (incoming instanceof Headers) {
        incoming.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(incoming)) {
        incoming.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else if (incoming) {
        Object.assign(headers, incoming);
      }

      const request = https.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: `${parsed.pathname}${parsed.search}`,
          method,
          headers,
          agent,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          response.on('end', () => {
            const body = Buffer.concat(chunks);
            const responseHeaders = new Headers();
            Object.entries(response.headers).forEach(([key, value]) => {
              if (Array.isArray(value)) responseHeaders.set(key, value.join(','));
              else if (typeof value === 'string') responseHeaders.set(key, value);
            });
            resolve(new Response(body, {
              status: response.statusCode || 500,
              headers: responseHeaders,
            }));
          });
        }
      );

      request.setTimeout(8000, () => {
        request.destroy();
        reject(new Error('انتهت مهلة الاتصال بقاعدة البيانات'));
      });
      request.on('error', reject);

      if (init?.body && method !== 'GET' && method !== 'HEAD') {
        if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) {
          request.write(init.body);
        } else if (init.body instanceof Uint8Array) {
          request.write(Buffer.from(init.body));
        } else {
          request.write(String(init.body));
        }
      }
      request.end();
    });
  };
}

let cachedServiceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  if (cachedServiceClient) return cachedServiceClient;
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createSupabaseServerFetch() as typeof fetch },
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
