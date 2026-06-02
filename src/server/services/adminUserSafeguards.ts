export function canDeleteUser(input: {
  targetUserId: string
  actingUserId: string
  targetIsPlatformAdmin: boolean
  platformAdminCount: number
}): { ok: true } | { ok: false; error: string } {
  if (input.targetUserId === input.actingUserId) {
    return { ok: false, error: 'Você não pode excluir a si mesmo.' }
  }
  if (input.targetIsPlatformAdmin && input.platformAdminCount <= 1) {
    return { ok: false, error: 'Não é possível excluir o último platform admin.' }
  }
  return { ok: true }
}
