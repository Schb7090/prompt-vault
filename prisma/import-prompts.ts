import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

const CSV_PATH = '/tmp/awesome-chatgpt-prompts/prompts.csv'

// RFC 4180 CSV parser — handles quoted fields with embedded newlines and commas
function parseCSV(text: string): string[][] {
  const records: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\n') { row.push(field); field = ''; records.push(row); row = [] }
      else if (ch !== '\r') { field += ch }
    }
  }
  if (row.length > 0 || field) { row.push(field); records.push(row) }
  return records
}

async function main() {
  const text = fs.readFileSync(CSV_PATH, 'utf-8')
  const [, ...rows] = parseCSV(text) // skip header

  // Ensure required categories exist
  const [codingCat, generalCat] = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Coding' },
      update: {},
      create: { name: 'Coding', color: '#3b82f6' },
    }),
    prisma.category.upsert({
      where: { name: 'General' },
      update: {},
      create: { name: 'General', color: '#64748b' },
    }),
  ])

  let order = 1
  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const [act, prompt, for_devs] = row
    const title = act?.trim()
    const content = prompt?.trim()
    if (!title || !content) { skipped++; continue }

    const categoryId = for_devs?.trim().toUpperCase() === 'TRUE' ? codingCat.id : generalCat.id

    await prisma.prompt.create({
      data: {
        title,
        content,
        model: 'GPT-4o',
        environment: 'ChatGPT',
        goodFor: title,
        rating: 0,
        order: order++,
        categoryId,
      },
    })
    imported++
    if (imported % 100 === 0) process.stdout.write(`  ${imported} imported...\r`)
  }

  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
