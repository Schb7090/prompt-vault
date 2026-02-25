import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { prompts } = body as { prompts: { id: string, order: number, categoryId?: string | null }[] };

        // We use a transaction to batch update all orders safely
        await prisma.$transaction(
            prompts.map((p) =>
                prisma.prompt.update({
                    where: { id: p.id },
                    data: { order: p.order, categoryId: p.categoryId !== undefined ? p.categoryId : undefined }
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to reorder prompts:', error);
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
    }
}
