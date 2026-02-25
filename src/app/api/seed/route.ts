import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const defaultCategories = [
            { name: 'Coding', color: '#3b82f6' },
            { name: 'Creative Writing', color: '#10b981' },
            { name: 'Data Analysis', color: '#f59e0b' },
            { name: 'Marketing & SEO', color: '#ec4899' },
            { name: 'Productivity', color: '#8b5cf6' },
            { name: 'Social Media', color: '#06b6d4' },
            { name: 'General', color: '#64748b' },
        ];

        for (const c of defaultCategories) {
            const existing = await prisma.category.findUnique({ where: { name: c.name } });
            if (!existing) {
                await prisma.category.create({ data: c });
            }
        }

        return NextResponse.json({ message: 'Seeded successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
