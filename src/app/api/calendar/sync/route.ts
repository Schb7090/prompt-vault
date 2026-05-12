import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isCalendarConfigured, getCalendarEvent } from '@/lib/google-calendar';

export async function POST() {
  if (!isCalendarConfigured()) {
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 });
  }

  const linkedPrompts = await prisma.prompt.findMany({
    where: { googleCalendarEventId: { not: null } },
    select: { id: true, scheduledAt: true, googleCalendarEventId: true },
  });

  let updated = 0;
  let unlinked = 0;

  for (const prompt of linkedPrompts) {
    const eventId = prompt.googleCalendarEventId!;
    try {
      const { startTime, deleted } = await getCalendarEvent(eventId);

      if (deleted) {
        await prisma.prompt.update({
          where: { id: prompt.id },
          data: { googleCalendarEventId: null, scheduledAt: null },
        });
        unlinked++;
      } else {
        const existingMs = prompt.scheduledAt ? new Date(prompt.scheduledAt).getTime() : null;
        const newMs = startTime.getTime();
        if (existingMs !== newMs) {
          await prisma.prompt.update({
            where: { id: prompt.id },
            data: { scheduledAt: startTime },
          });
          updated++;
        }
      }
    } catch {
      // Skip events that fail to fetch
    }
  }

  return NextResponse.json({ synced: linkedPrompts.length, updated, unlinked });
}
