import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { savePromptToMarkdown } from '@/lib/backup';
import { isCalendarConfigured, createCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const categoryId = searchParams.get('categoryId');
        const ratingStr = searchParams.get('rating');
        const rating = ratingStr ? parseInt(ratingStr, 10) : undefined;

        const where: any = {};
        if (q) {
            where.OR = [
                { title: { contains: q } },
                { content: { contains: q } },
            ];
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (rating) {
            where.rating = rating;
        }

        const prompts = await prisma.prompt.findMany({
            where,
            include: { category: true },
            orderBy: [
                { order: 'asc' } as any,
                { updatedAt: 'desc' }
            ],
        });
        return NextResponse.json(prompts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { title, content, model, environment, goodFor, description, rating, categoryId, scheduledAt } = await request.json();

        const prompts = await prisma.prompt.findMany();

        let prompt = await prisma.prompt.create({
            data: {
                title,
                content,
                model: model || 'Unknown',
                environment: environment || 'Unknown',
                goodFor: goodFor || null,
                description: description || null,
                rating: rating || 0,
                categoryId: categoryId || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                order: prompts.length > 0 ? Math.max(...prompts.map((p: any) => p.order || 0)) + 1 : 0
            },
            include: { category: true },
        });

        if (scheduledAt && isCalendarConfigured()) {
            try {
                const eventId = await createCalendarEvent({
                    id: prompt.id,
                    title: prompt.title,
                    description: prompt.description,
                    scheduledAt: new Date(scheduledAt),
                });
                prompt = await prisma.prompt.update({
                    where: { id: prompt.id },
                    data: { googleCalendarEventId: eventId },
                    include: { category: true },
                }) as typeof prompt;
            } catch {
                // Calendar sync failure is non-fatal
            }
        }

        await savePromptToMarkdown(prompt);

        return NextResponse.json(prompt, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }
}
