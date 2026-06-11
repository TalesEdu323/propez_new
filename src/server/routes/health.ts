import express from 'express';
import type { Request, Response, Router } from 'express';
import type pg from 'pg';
import type { IntegrationsConfig } from '../config.js';
import type { EnvironmentConfig } from '../env.js';
import { isMailConfigured } from '../env.js';
import { isSecretCryptoAvailable } from '../lib/secretCrypto.js';
import { getPdfStorageInfo } from '../storage/pdfStorageMode.js';

export interface HealthRouterOptions {
  pool: pg.Pool;
  integrationsConfig: IntegrationsConfig;
  config: EnvironmentConfig;
}

type IntegrationState = 'configured' | 'placeholder' | 'missing';

function classifyIntegrationKey(value: string | null): IntegrationState {
  if (!value) return 'missing';
  if (value.includes('<PREENCHER>') || value.endsWith('_PREENCHER')) return 'placeholder';
  return 'configured';
}

function isLocalUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return true;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(u) || u.startsWith('http://');
}

export function createHealthRouter({ pool, integrationsConfig, config }: HealthRouterOptions): Router {
  const router = express.Router();

  router.get('/boot-check', async (_req: Request, res: Response) => {
    const dbUrl = config.databaseUrl;
    const hasPooler = dbUrl.includes('-pooler');
    let dbOk = false;
    let dbError: string | null = null;
    try {
      await pool.query('SELECT 1');
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }

    const migrationHint =
      !hasPooler && (process.env.VERCEL === '1' || config.nodeEnv === 'production')
        ? 'Prefira DATABASE_URL com host Neon "-pooler" na Vercel.'
        : undefined;

    const mail = config.mail;
    const mailWarnings: string[] = [];
    if (!isMailConfigured(mail)) {
      mailWarnings.push(
        config.nodeEnv === 'production'
          ? 'Provedor de e-mail não configurado — auth e envios falham com 503.'
          : 'E-mail em modo simulação (provider=none).',
      );
    } else if (process.env.VERCEL === '1' && mail.provider === 'smtp') {
      mailWarnings.push(
        'Vercel + SMTP: prefira RESEND_API_KEY e MAIL_PROVIDER=resend para envio confiável em serverless.',
      );
    }

    const storage = getPdfStorageInfo();
    const storageWarnings: string[] = [];
    if ((process.env.VERCEL === '1' || config.nodeEnv === 'production') && !storage.hasBlobToken) {
      storageWarnings.push(
        'BLOB_READ_WRITE_TOKEN ausente — upload de PDF usa BYTEA (limite ~4 MB) ou falha em arquivos grandes.',
      );
    }

    const ok = dbOk;
    res.status(ok ? 200 : 503).json({
      ok,
      nodeEnv: config.nodeEnv,
      hasDatabaseUrl: Boolean(dbUrl?.trim()),
      hasJwtSecret: Boolean(config.auth.jwtSecret?.trim()),
      hasAppUrl: Boolean(config.appUrl?.trim()),
      dbOk,
      dbError,
      hasPooler,
      migrationHint,
      bootErrors: [],
      storage: {
        hasBlobToken: storage.hasBlobToken,
        pdfMode: storage.pdfMode,
        warnings: storageWarnings,
      },
      mail: {
        provider: mail.provider,
        configured: isMailConfigured(mail),
        from: mail.from,
        smtpHost: mail.smtp?.host ?? null,
        hasResendKey: Boolean(mail.resendApiKey),
        warnings: mailWarnings,
      },
    });
  });

  router.get('/health', async (_req: Request, res: Response) => {
    let dbStatus = false;
    let client: pg.PoolClient | null = null;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      dbStatus = !!result.rows[0];
    } catch (err) {
      console.error('Database connection error:', err);
    } finally {
      client?.release();
    }

    const prosyncState = classifyIntegrationKey(integrationsConfig.prosync.apiKey);
    const prosyncSecretState = classifyIntegrationKey(integrationsConfig.prosync.webhookSecret);
    const appUrlPublic = !isLocalUrl(integrationsConfig.appUrl);
    const suiteEnabled = Boolean(integrationsConfig.suiteSecret && integrationsConfig.suiteSecret.length >= 32);
    const credsCryptoAvailable = isSecretCryptoAvailable();

    const warnings: string[] = [];
    if (prosyncState === 'placeholder') {
      warnings.push('PROSYNC_API_KEY ainda contém <PREENCHER>; substitua por uma chave ps_live_... real.');
    }
    if (prosyncState === 'configured' && prosyncSecretState !== 'configured') {
      warnings.push('PROSYNC_WEBHOOK_SECRET ausente — webhooks inbound do ProSync retornarão 401.');
    }
    if (prosyncState === 'configured' && !appUrlPublic) {
      warnings.push('APP_URL é local — ProSync na nuvem não consegue entregar webhooks. Use ngrok/Cloudflare Tunnel ou deploy.');
    }
    if (!suiteEnabled) {
      warnings.push('TAGGO_SUITE_SECRET ausente — sem provisionamento automático cross-app. Defina o mesmo segredo nos 3 apps da suíte.');
    }
    if (suiteEnabled && !credsCryptoAvailable) {
      warnings.push('Cifra de credenciais indisponível — defina CREDENTIALS_KEY ou TAGGO_SUITE_SECRET com ao menos 32 chars.');
    }
    if (!isMailConfigured(config.mail)) {
      warnings.push(
        config.nodeEnv === 'production'
          ? 'Provedor de e-mail não configurado — auth e notificações por e-mail estão desativados.'
          : 'Provedor de e-mail não configurado — e-mails serão simulados no console (provider=none).',
      );
    }

    const storage = getPdfStorageInfo();
    if ((process.env.VERCEL === '1' || config.nodeEnv === 'production') && !storage.hasBlobToken) {
      warnings.push(
        'BLOB_READ_WRITE_TOKEN ausente — upload de PDF de contrato limitado ou indisponível para arquivos grandes.',
      );
    }

    res.status(dbStatus ? 200 : 503).json({
      status: dbStatus ? 'ok' : 'degraded',
      database: dbStatus,
      appUrl: integrationsConfig.appUrl,
      appUrlPublic,
      mail: {
        provider: config.mail.provider,
        configured: isMailConfigured(config.mail),
        from: config.mail.from,
      },
      integrations: {
        prosync: prosyncState === 'configured',
      },
      suite: {
        enabled: suiteEnabled,
        credentialsEncryption: credsCryptoAvailable,
      },
      detail: {
        prosync: {
          apiKey: prosyncState,
          webhookSecret: prosyncSecretState,
          baseUrl: integrationsConfig.prosync.baseUrl,
        },
      },
      storage: {
        hasBlobToken: storage.hasBlobToken,
        pdfMode: storage.pdfMode,
      },
      warnings,
    });
  });

  return router;
}
