export const PUBLIC_SETTINGS_KEYS = [
  'items',
  'categories',
  'marketingFilters',
  'dishBuilderSettings',
  'deliveryZones',
  'coupons',
  'storeScheduleSettings',
  'heroFeaturedItemIds',
  'heroFeaturedItemId',
  'heroBadgeText',
  'isWalletPaymentEnabled',
  'isInstapayPaymentEnabled',
  'walletPhoneNumber',
  'walletAccountName',
  'instapayHandle',
  'instapayLink',
  'ordersWhatsappNumber',
  'restaurantPhoneNumber',
  'cartIncentiveSettings',
  'kosharyCustomOptions',
  'isCouponsEnabled',
  'isMinOrderEnabled',
] as const;

export type PublicSettingsKey = (typeof PUBLIC_SETTINGS_KEYS)[number];

export interface ExtractedSecrets {
  monitorPassword?: string;
  instanceId?: string;
  apiToken?: string;
}

export function pickPublicSettings(data: Record<string, unknown> | null | undefined) {
  if (!data || typeof data !== 'object') return {};
  const picked: Record<string, unknown> = {};
  for (const key of PUBLIC_SETTINGS_KEYS) {
    if (data[key] !== undefined) {
      picked[key] = data[key];
    }
  }
  if (picked.whatsappNotificationSettings || data.whatsappNotificationSettings) {
    const wa = (data.whatsappNotificationSettings || {}) as Record<string, unknown>;
    picked.whatsappNotificationSettings = {
      isEnabled: wa.isEnabled,
      sendMode: wa.sendMode,
      confirmTemplate: wa.confirmTemplate,
      cancelTemplate: wa.cancelTemplate,
      instanceId: '',
      apiToken: '',
    };
  }
  return picked;
}

export function extractSecretsFromSettings(data: Record<string, unknown> | null | undefined): ExtractedSecrets {
  if (!data || typeof data !== 'object') return {};
  const wa = (data.whatsappNotificationSettings || {}) as Record<string, unknown>;
  const secrets: ExtractedSecrets = {};
  if (typeof data.monitorPassword === 'string' && data.monitorPassword.trim()) {
    secrets.monitorPassword = data.monitorPassword.trim();
  }
  if (typeof wa.instanceId === 'string' && wa.instanceId.trim()) {
    secrets.instanceId = wa.instanceId.trim();
  }
  if (typeof wa.apiToken === 'string' && wa.apiToken.trim()) {
    secrets.apiToken = wa.apiToken.trim();
  }
  return secrets;
}

export function stripSecretsFromSettings(data: Record<string, any>): Record<string, any> {
  const next = { ...data };
  delete next.monitorPassword;
  if (next.whatsappNotificationSettings && typeof next.whatsappNotificationSettings === 'object') {
    next.whatsappNotificationSettings = {
      ...next.whatsappNotificationSettings,
      instanceId: '',
      apiToken: '',
    };
  }
  return next;
}
