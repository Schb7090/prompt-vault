import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { savePromptToMarkdown } from '@/lib/backup';
import {
    isCalendarConfigured,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '@/lib/google-calendar';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { title, content, model, environment, goodFor, description, rating, categoryId, scheduledAt } = await request.json();

        const existing = await prisma.prompt.findUnique({ where: { id } });

        const newScheduledAt = scheduledAt ? new Date(scheduledAt) : null;

        let prompt = await prisma.prompt.update({
            where: { id },
            data: {
                title,
                content,
                model,
                environment,
                goodFor: goodFor || null,
                description: description || null,
                rating,
                categoryId: categoryId || null,
                scheduledAt: newScheduledAt,
            },
            include: { category: true },
        });

        if (isCalendarConfigured()) {
            try {
                const calId = existing?.googleCalendarEventId;
                if (newScheduledAt && calId) {
                    await updateCalendarEvent(calId, { id, title, description, scheduledAt: newScheduledAt });
                } else if (newScheduledAt && !calId) {
                    const eventId = await createCalendarEvent({ id, title, description, scheduledAt: newScheduledAt });
                    prompt = await prisma.prompt.update({
                        where: { id },
                        data: { googleCalendarEventId: eventId },
                        include: { category: true },
                    }) as typeof prompt;
                } else if (!newScheduledAt && calId) {
                    await deleteCalendarEvent(calId);
                    await prisma.prompt.update({ where: { id }, data: { googleCalendarEventId: null } });
                }
            } catch {
                // Calendar sync failure is non-fatal
            }
        }

        await savePromptToMarkdown(prompt);

        return NextResponse.json(prompt);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const existing = await prisma.prompt.findUnique({ where: { id } });

        if (existing?.googleCalendarEventId && isCalendarConfigured()) {
            try {
                await deleteCalendarEvent(existing.googleCalendarEventId);
            } catch {
                // Non-fatal
            }
        }

        await prisma.prompt.delete({ where: { id } });
        return NextResponse.json({ message: 'Prompt deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }
}
