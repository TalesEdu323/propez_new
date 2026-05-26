/**
 * Adapter SSO Taggo para o Propez (servidor Express).
 *
 * Implementa o cliente OIDC (Authorization Code + PKCE) que conversa com
 * `taggo-accounts`. Fluxo:
 *
 *   1. Usuário clica em "Entrar com Taggo" → GET /api/sso/start
 *      → Propez gera state + code_verifier, grava em cookie httpOnly e redireciona
 *        para `<TAGGO_ISSUER>/api/authorize?...`.
 *
 *   2. IdP autentica e redireciona para
 *      `<APP_URL>/api/sso/callback?code=...&state=...`.
 *
 *   3. Propez valida state, troca code por id_token + access_token no IdP,
 *      valida JWT (RS256 via JWKS) e abre sessão local mapeando o `sub` →
 *      `users.id` via tabela `taggo_identity_links` (criada sob demanda).
 *
 * Configuração (envs do Propez):
 *   TAGGO_SSO_ISSUER=https://accounts.taggo.com.br
 *   TAGGO_SSO_CLIENT_ID=propez
 *   TAGGO_SSO_CLIENT_SECRET=<segredo>
 *   TAGGO_SSO_REDIRECT_URI=https://propez.taggo.com.br/api/sso/callback
 */
import crypto from 'node:crypto'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface SsoConfig {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function loadSsoConfig(): SsoConfig | null {
  const issuer = (process.env.TAGGO_SSO_ISSUER || '').trim().replace(/\/+$/, '')
  const clientId = (process.env.TAGGO_SSO_CLIENT_ID || '').trim()
  const clientSecret = (process.env.TAGGO_SSO_CLIENT_SECRET || '').trim()
  const redirectUri = (process.env.TAGGO_SSO_REDIRECT_URI || '').trim()
  if (!issuer || !clientId || !clientSecret || !redirectUri) return null
  return { issuer, clientId, clientSecret, redirectUri }
}

export function base64UrlSha256(input: string): string {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(48).toString('base64url')
}

export function buildAuthorizeUrl(
  cfg: SsoConfig,
  opts: { state: string; codeChallenge: string; scope?: string; nonce?: string },
): string {
  const url = new URL(`${cfg.issuer}/api/authorize`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('redirect_uri', cfg.redirectUri)
  url.searchParams.set('scope', opts.scope || 'openid email profile')
  url.searchParams.set('state', opts.state)
  url.searchParams.set('code_challenge', opts.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (opts.nonce) url.searchParams.set('nonce', opts.nonce)
  return url.toString()
}

interface TokenResponse {
  id_token: string
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export async function exchangeCodeForTokens(
  cfg: SsoConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code_verifier: codeVerifier,
  })
  const res = await fetch(`${cfg.issuer}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = (await res.json()) as TokenResponse & { error?: string }
  if (!res.ok || !data.id_token) {
    throw new Error(`Falha na troca de tokens: ${data.error || res.status}`)
  }
  return data
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
let jwksIssuer: string | null = null

function getJwksFor(issuer: string) {
  if (!jwks || jwksIssuer !== issuer) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/api/jwks`))
    jwksIssuer = issuer
  }
  return jwks
}

export interface TaggoIdTokenClaims extends JWTPayload {
  email?: string
  name?: string
  nonce?: string
}

export async function verifyIdToken(
  cfg: SsoConfig,
  idToken: string,
): Promise<TaggoIdTokenClaims> {
  const { payload } = await jwtVerify(idToken, getJwksFor(cfg.issuer), {
    issuer: cfg.issuer,
    audience: cfg.clientId,
  })
  return payload as TaggoIdTokenClaims
}
