import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const confirmEmailChangeSchema = z.object({
  code: z.string().trim().length(6),
})

const updateUserSchema = z
  .object({
    isPlatformAdmin: z.boolean().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar' })

describe('auth security schemas', () => {
  it('validates change-password payload', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: '12345678' }).success).toBe(
      true,
    )
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: '12345678' }).success).toBe(
      false,
    )
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short' }).success).toBe(
      false,
    )
  })

  it('validates email-change request', () => {
    expect(
      requestEmailChangeSchema.safeParse({
        newEmail: '  New@Example.COM  ',
        password: 'secret',
      }).success,
    ).toBe(true)
    const parsed = requestEmailChangeSchema.parse({
      newEmail: '  New@Example.COM  ',
      password: 'secret',
    })
    expect(parsed.newEmail).toBe('new@example.com')
  })

  it('validates email-change confirmation code', () => {
    expect(confirmEmailChangeSchema.safeParse({ code: '123456' }).success).toBe(true)
    expect(confirmEmailChangeSchema.safeParse({ code: '12345' }).success).toBe(false)
  })
})

describe('admin updateUser schema', () => {
  it('accepts partial patches', () => {
    expect(updateUserSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
    expect(updateUserSchema.safeParse({ isPlatformAdmin: true }).success).toBe(true)
    expect(updateUserSchema.safeParse({ name: 'João' }).success).toBe(true)
  })

  it('rejects empty patch', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false)
  })
})
