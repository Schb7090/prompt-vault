import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { beforeEach, vi } from 'vitest'

const prisma = mockDeep<PrismaClient>()

vi.mock('@/lib/prisma', () => ({ default: prisma }))

beforeEach(() => {
  mockReset(prisma)
})

export default prisma
