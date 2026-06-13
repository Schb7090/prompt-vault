import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, writeRefreshTokenToEnv } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?calendarError=' + encodeURIComponent(error), req.url));
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
    const { refreshToken } = await exchangeCodeForTokens(code);
    writeRefreshTokenToEnv(refreshToken);
    return NextResponse.redirect(new URL('/?calendarConnected=1', req.url));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(new URL('/?calendarError=' + encodeURIComponent(msg), req.url));
  }
}
