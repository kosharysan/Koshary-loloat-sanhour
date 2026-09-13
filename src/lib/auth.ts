import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export type SessionRole = 'admin' | 'monitor';

export interface SessionPayload {
  role: SessionRole;
  exp: number;
  nonce: string;
}

const ADMIN_COOKIE = 'admin_session';
const MONITOR_COOKIE = 'monitor_session';
const TOKEN_HOURS = 12;

function getSessionSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (adminPassword) {
    return createHmac('sha256', 'loloat-sanhour-session-v1').update(adminPassword).digest('hex');
  }
  return '';
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function verifyPassword(input: string, expected: string): boolean {
  if (!expected) return false;
  return safeEqualString(input, expected);
}

export function createSessionToken(role: SessionRole): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('Session secret is not configured');
  }
  const payload: SessionPayload = {
    role,
    exp: Date.now() + TOKEN_HOURS * 60 * 60 * 1000,
    nonce: randomBytes(16).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const secret = getSessionSecret();
  if (!secret) return null;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  if (!safeEqualString(signature, sign(encoded, secret))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.role !== 'admin' && parsed.role !== 'monitor') return null;
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const admin = verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (admin?.role === 'admin') return admin;
  const monitor = verifySessionToken(req.cookies.get(MONITOR_COOKIE)?.value);
  if (monitor?.role === 'monitor' || monitor?.role === 'admin') return monitor;
  return null;
}

export function requireSession(
  req: NextRequest,
  roles: SessionRole[] = ['admin', 'monitor']
): SessionPayload | NextResponse {
  const session = getSessionFromRequest(req);
  if (!session || !roles.includes(session.role)) {
    return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
  }
  return session;
}

export function attachSessionCookie(response: NextResponse, role: SessionRole): NextResponse {
  const token = createSessionToken(role);
  const cookieName = role === 'admin' ? ADMIN_COOKIE : MONITOR_COOKIE;
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return response;
}

export function clearSessionCookie(response: NextResponse, role: SessionRole): NextResponse {
  response.cookies.delete(role === 'admin' ? ADMIN_COOKIE : MONITOR_COOKIE);
  return response;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || '';
}
