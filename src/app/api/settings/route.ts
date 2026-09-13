import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import {
  extractSecretsFromSettings,
  pickPublicSettings,
  stripSecretsFromSettings,
} from '@/lib/publicSettings';
import { adminGetSettings, adminSaveSecrets, adminSaveSettings } from '@/lib/supabaseAdmin';

export async function PUT(req: NextRequest) {
  const session = requireSession(req, ['admin']);
  if (session instanceof NextResponse) return session;

  try {
    const incoming = await req.json();
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
    }

    const extracted = extractSecretsFromSettings(incoming);
    if (extracted.monitorPassword || extracted.instanceId || extracted.apiToken) {
      const secretRes = await adminSaveSecrets(extracted);
      if (!secretRes.success) {
        return NextResponse.json({ success: false, error: secretRes.error }, { status: 500 });
      }
    }

    const current = (await adminGetSettings()) || {};
    const publicPatch = pickPublicSettings(incoming);
    const merged = stripSecretsFromSettings({
      ...current,
      ...publicPatch,
    });

    const res = await adminSaveSettings(merged);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'تعذر حفظ الإعدادات' },
      { status: 500 }
    );
  }
}
