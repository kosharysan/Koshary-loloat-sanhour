import { NextResponse } from 'next/server';
import { adminGetSettings, getPublicMenuPayload } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const settings = await adminGetSettings();
    return NextResponse.json({ success: true, data: getPublicMenuPayload(settings) });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'تعذر تحميل المنيو' },
      { status: 500 }
    );
  }
}
