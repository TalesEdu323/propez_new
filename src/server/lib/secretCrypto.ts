/**
 * Criptografia simétrica AES-256-GCM para credenciais de parceiros (Suíte
 * Taggo). Usada para armazenar API Keys do ProSync/Rubrica cifradas em
 * `org_integration_credentials.encrypted_api_key`.
 *
 * Chave de cifra:
 *   1. `CREDENTIALS_KEY` (se definida; recomendado em produção).
 *   2. Derivada de `TAGGO_SUITE_SECRET` via SHA-256 (fallback automático).
 *
 * Formato do payload: base64( IV(12) | TAG(16) | CIPHERTEXT ).
 */
import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

function loadKey(): Buffer | null {
  const explicit = process.env.CREDENTIALS_KEY
  if (explicit && explicit.length >= 32) {
    return crypto.createHash('sha256').update(explicit).digest()
  }
  const suite = process.env.TAGGO_SUITE_SECRET
  if (suite && suite.length >= 32) {
    return crypto.createHash('sha256').update(`creds:${suite}`).digest()
  }
  return null
}

export class SecretCryptoUnavailableError extends Error {
  constructor() {
    super(
      'Cifra de credenciais indisponível: defina CREDENTIALS_KEY ou TAGGO_SUITE_SECRET (>= 32 chars)',
    )
    this.name = 'SecretCryptoUnavailableError'
  }
}

export function isSecretCryptoAvailable(): boolean {
  return !!loadKey()
}

export function encryptSecret(plain: string): string {
  const key = loadKey()
  if (!key) throw new SecretCryptoUnavailableError()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const key = loadKey()
  if (!key) throw new SecretCryptoUnavailableError()
  if (key.byteLength !== KEY_BYTES) {
    throw new Error('Chave de cifra inválida (tamanho)')
  }
  const buf = Buffer.from(payload, 'base64')
  if (buf.byteLength < IV_BYTES + 16 + 1) {
    throw new Error('Payload cifrado inválido')
  }
  const iv = buf.subarray(0, IV_BYTES)
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16)
  const ct = buf.subarray(IV_BYTES + 16)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}
