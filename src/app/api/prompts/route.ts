import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { savePromptToMarkdown } from '@/lib/backup';

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
        const { title, content, model, environment, goodFor, description, rating, categoryId } = await request.json();

        // Get all prompts to calculate order
        const prompts = await prisma.prompt.findMany();

        const prompt = await prisma.prompt.create({
            data: {
                title,
                content,
                model: model || 'Unknown',
                environment: environment || 'Unknown',
                goodFor: goodFor || null,
                description: description || null,
                rating: rating || 0,
                categoryId: categoryId || null,
                order: prompts.length > 0 ? Math.max(...prompts.map((p: any) => p.order || 0)) + 1 : 0
            },
            include: { category: true },
        });

        // Save to backup folder
        await savePromptToMarkdown(prompt);

        return NextResponse.json(prompt, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
    }
}
