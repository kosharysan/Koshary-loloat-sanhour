import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { adminGetSecrets, adminSaveSecrets, migratePublicSecrets } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const session = requireSession(req, ['admin']);
  if (session instanceof NextResponse) return session;

  await migratePublicSecrets();
  const secrets = await adminGetSecrets();
  return NextResponse.json({
    monitorPassword: secrets.monitorPassword || '',
    instanceId: secrets.instanceId || '',
    apiToken: secrets.apiToken || '',
  });
}

export async function PUT(req: NextRequest) {
  const session = requireSession(req, ['admin']);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const res = await adminSaveSecrets({
      monitorPassword: typeof body.monitorPassword === 'string' ? body.monitorPassword : undefined,
      instanceId: typeof body.instanceId === 'string' ? body.instanceId : undefined,
      apiToken: typeof body.apiToken === 'string' ? body.apiToken : undefined,
    });
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'تعذر حفظ البيانات السرية' },
      { status: 500 }
    );
  }
}
