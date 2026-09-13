import { NextRequest, NextResponse } from 'next/server';
import {
  attachSessionCookie,
  clearSessionCookie,
  getClientIp,
  verifyPassword,
} from '@/lib/auth';
import { getMonitorPassword } from '@/lib/supabaseAdmin';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const loginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

export async function POST(req: NextRequest) {
  try {
    const monitorPassword = await getMonitorPassword();
    if (!monitorPassword) {
      return NextResponse.json(
        { success: false, message: 'كلمة مرور شاشة المتابعة غير مضبوطة. اضبطها من إعدادات الأدمن أو MONITOR_PASSWORD.' },
        { status: 503 }
      );
    }

    const ip = getClientIp(req);
    const now = Date.now();
    const currentStatus = loginAttempts.get(ip);
    if (currentStatus && currentStatus.lockedUntil > now) {
      const remainingMinutes = Math.ceil((currentStatus.lockedUntil - now) / (60 * 1000));
      return NextResponse.json(
        {
          success: false,
          message: 'تم قفل الدخول مؤقتا بسبب محاولات متكررة. يرجى المحاولة بعد ' + remainingMinutes + ' دقيقة.',
        },
        { status: 429 }
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    if (verifyPassword(password.trim(), monitorPassword)) {
      loginAttempts.delete(ip);
      const response = NextResponse.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
      });
      return attachSessionCookie(response, 'monitor');
    }

    const attempts = (currentStatus?.attempts || 0) + 1;
    let lockedUntil = 0;
    if (attempts >= MAX_ATTEMPTS) {
      lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
    }
    loginAttempts.set(ip, { attempts, lockedUntil });

    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - attempts);
    return NextResponse.json(
      {
        success: false,
        message:
          remainingAttempts > 0
            ? 'كلمة المرور غير صحيحة. متبقي ' + remainingAttempts + ' محاولات.'
            : 'تم قفل الدخول لمدة ' + LOCKOUT_MINUTES + ' دقيقة بسبب تجاوز الحد الأقصى للمحاولات.',
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
  return clearSessionCookie(response, 'monitor');
}
