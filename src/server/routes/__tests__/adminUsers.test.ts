import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const updateUserSchema = z
  .object({
    isPlatformAdmin: z.boolean().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar' })

describe('admin user patch schema', () => {
  it('normalizes email to lowercase', () => {
    const parsed = updateUserSchema.parse({ email: 'User@Test.COM' })
    expect(parsed.email).toBe('user@test.com')
  })

  it('allows combined admin + email patch', () => {
    const parsed = updateUserSchema.parse({
      isPlatformAdmin: true,
      email: 'admin@test.com',
    })
    expect(parsed.isPlatformAdmin).toBe(true)
    expect(parsed.email).toBe('admin@test.com')
  })
})
