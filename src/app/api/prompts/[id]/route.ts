import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { title, content, model, environment, goodFor, description, rating, categoryId } = await request.json();
        const prompt = await prisma.prompt.update({
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
            },
            include: { category: true },
        });
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
        await prisma.prompt.delete({
            where: { id },
        });
        return NextResponse.json({ message: 'Prompt deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }
}
