import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const categories = await prisma.category.createMany({
        data: [
            { name: 'Coding', color: '#3b82f6' },
            { name: 'Creative Writing', color: '#10b981' },
            { name: 'Data Analysis', color: '#f59e0b' },
            { name: 'General', color: '#64748b' },
        ],
    });
    console.log('Seeded categories:', categories);
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
