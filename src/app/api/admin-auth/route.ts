import { NextRequest, NextResponse } from 'next/server';
import {
  attachSessionCookie,
  clearSessionCookie,
  getAdminPassword,
  getClientIp,
  verifyPassword,
} from '@/lib/auth';
import { clearRateLimit, hitRateLimit } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return NextResponse.json(
        { success: false, message: 'كلمة مرور الأدمن غير مضبوطة على السيرفر. أضف ADMIN_PASSWORD.' },
        { status: 503 }
      );
    }

    const ip = getClientIp(req);
    const limitKey = `admin-login:${ip}`;

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    if (await hitRateLimit(limitKey, MAX_ATTEMPTS, LOCKOUT_MS)) {
      return NextResponse.json(
        {
          success: false,
          message: 'تم قفل الدخول مؤقتا بسبب محاولات متكررة. يرجى المحاولة بعد ' + LOCKOUT_MINUTES + ' دقيقة.',
        },
        { status: 429 }
      );
    }

    if (verifyPassword(password, adminPassword)) {
      await clearRateLimit(limitKey);
      const response = NextResponse.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
      });
      return attachSessionCookie(response, 'admin');
    }

    return NextResponse.json(
      {
        success: false,
        message: 'كلمة المرور غير صحيحة.',
      },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'حدث خطأ غير متوقع في الخادم' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  return clearSessionCookie(response, 'admin');
}
