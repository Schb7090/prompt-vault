import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const prompts = await prisma.prompt.findMany({
            include: { category: true },
            orderBy: [
                { order: 'asc' },
                { updatedAt: 'desc' },
            ],
        });

        const data = prompts.map((p) => ({
            Title: p.title,
            Model: p.model,
            Environment: p.environment,
            'Good For': p.goodFor || '',
            Rating: p.rating,
            Category: p.category?.name || 'N/A',
            Description: p.description || '',
            Content: p.content,
            'Created At': p.createdAt.toISOString(),
            'Updated At': p.updatedAt.toISOString(),
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Prompts');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(buffer, {
            headers: {
                'Content-Disposition': 'attachment; filename="prompts_export.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (error) {
        console.error('Failed to export prompts:', error);
        return NextResponse.json({ error: 'Failed to export prompts' }, { status: 500 });
    }
}
