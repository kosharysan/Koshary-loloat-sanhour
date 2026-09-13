import { restaurantInfo } from '@/data/mockData';

export function getTelHref(phone: string) {
  const cleaned = (phone || '').replace(/[^\d+]/g, '');
  return `tel:${cleaned || restaurantInfo.phone}`;
}

export function isGenericInstapayHomepage(link?: string) {
  const raw = (link || '').trim().replace(/\/+$/, '');
  return /^https?:\/\/(www\.)?ipn\.eg$/i.test(raw);
}

export function normalizeInstapayLink(link?: string) {
  const raw = (link || '').trim();
  if (!raw || isGenericInstapayHomepage(raw)) return '';
  return raw;
}

export function getInstapayOpenLink(handle?: string, customLink?: string) {
  const custom = normalizeInstapayLink(customLink);
  if (/^https?:\/\//i.test(custom)) return custom;

  const raw = (handle || '').trim();
  if (/^https?:\/\//i.test(raw) && !isGenericInstapayHomepage(raw)) return raw;

  const username = raw.replace(/@instapay$/i, '').replace(/^@/, '').trim();
  if (username) return `https://ipn.eg/S/${encodeURIComponent(username)}`;

  return 'https://ipn.eg';
}
