import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getWhatsAppGatewayCredentials } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const session = requireSession(req, ['admin', 'monitor']);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const { phone, text } = body;

    if (!phone || !text) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف أو نص الرسالة مفقود' }, { status: 400 });
    }

    const override =
      session.role === 'admin'
        ? { instanceId: body.instanceId, apiToken: body.apiToken }
        : undefined;

    const { instanceId, apiToken } = await getWhatsAppGatewayCredentials(override);

    if (!instanceId || !apiToken) {
      return NextResponse.json(
        { success: false, error: 'بيانات الربط (Instance ID و Token) غير محددة' },
        { status: 400 }
      );
    }

    let cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '2' + cleanPhone;
    }

    const params = new URLSearchParams();
    params.append('token', apiToken);
    params.append('to', cleanPhone);
    params.append('body', String(text));

    const gatewayUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.error)) {
      const errorMsg = data?.error || data?.message || `فشل الإرسال من المزود (كود ${res.status})`;
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[WhatsApp Background Send Error]:', err);
    return NextResponse.json(
      { success: false, error: err.name === 'AbortError' ? 'انتهت مهلة الاتصال بخادم الواتساب' : err.message },
      { status: 500 }
    );
  }
}
