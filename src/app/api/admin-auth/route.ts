import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sanhour2026';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const loginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local-admin-ip';
    const now = Date.now();

    const currentStatus = loginAttempts.get(ip);
    if (currentStatus && currentStatus.lockedUntil > now) {
      const remainingMinutes = Math.ceil((currentStatus.lockedUntil - now) / (60 * 1000));
      return NextResponse.json(
        {
          success: false,
          message: 'تم قفل الدخول مؤقتا بسبب محاولات متكررة. يرجى المحاولة بعد ' + remainingMinutes + ' دقيقة.'
        },
        { status: 429 }
      );
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    if (password === ADMIN_PASSWORD) {
      loginAttempts.delete(ip);

      const sessionToken = Buffer.from('admin_auth_' + now + '_loloat_sanhour_secure_key').toString('base64');

      const response = NextResponse.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح'
      });

      response.cookies.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });

      return response;
    } else {
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
              : 'تم قفل الدخول لمدة ' + LOCKOUT_MINUTES + ' دقيقة بسبب تجاوز الحد الأقصى للمحاولات.'
        },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'حدث خطأ غير متوقع في الخادم' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  response.cookies.delete('admin_session');
  return response;
}
