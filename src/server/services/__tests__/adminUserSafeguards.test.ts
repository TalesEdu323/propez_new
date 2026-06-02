import { describe, expect, it } from 'vitest'
import { canDeleteUser } from '../adminUserSafeguards.js'

describe('canDeleteUser', () => {
  it('blocks self-deletion', () => {
    const result = canDeleteUser({
      targetUserId: 'user-1',
      actingUserId: 'user-1',
      targetIsPlatformAdmin: false,
      platformAdminCount: 2,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('si mesmo')
  })

  it('blocks deleting last platform admin', () => {
    const result = canDeleteUser({
      targetUserId: 'admin-1',
      actingUserId: 'admin-2',
      targetIsPlatformAdmin: true,
      platformAdminCount: 1,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('último platform admin')
  })

  it('allows deleting non-admin when other admins exist', () => {
    const result = canDeleteUser({
      targetUserId: 'user-2',
      actingUserId: 'admin-1',
      targetIsPlatformAdmin: false,
      platformAdminCount: 1,
    })
    expect(result).toEqual({ ok: true })
  })

  it('allows deleting platform admin when others remain', () => {
    const result = canDeleteUser({
      targetUserId: 'admin-2',
      actingUserId: 'admin-1',
      targetIsPlatformAdmin: true,
      platformAdminCount: 2,
    })
    expect(result).toEqual({ ok: true })
  })
})
