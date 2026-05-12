import { NextResponse } from 'next/server';
import { isCalendarConfigured, listUpcomingEvents } from '@/lib/google-calendar';

export async function GET() {
  if (!isCalendarConfigured()) {
    return NextResponse.json({ configured: false, events: [] });
  }

  try {
    const events = await listUpcomingEvents(20);
    return NextResponse.json({ configured: true, events });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
