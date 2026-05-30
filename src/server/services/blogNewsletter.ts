import type { Pool } from 'pg';
import type { MailClient } from '../mail/client.js';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
};

export function buildPostNewsletterHtml(post: PostRow, appUrl: string): string {
  const postUrl = `${appUrl.replace(/\/+$/, '')}/blog/${post.slug}`;
  const cover = post.cover_image
    ? `<img src="${post.cover_image}" alt="" style="width:100%;border-radius:8px;margin-bottom:20px;">`
    : '';
  const summary = post.summary ? `<p style="color:#666;">${post.summary}</p>` : '';

  return `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#18181b;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:20px;">Novo artigo no blog Propez</h1>
  </div>
  <div style="background:#f4f4f5;padding:24px;border-radius:0 0 8px 8px;">
    ${cover}
    <h2 style="color:#18181b;">${post.title}</h2>
    ${summary}
    <p style="margin:24px 0;"><a href="${postUrl}" style="background:#18181b;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ler artigo completo</a></p>
    <p style="color:#999;font-size:12px;text-align:center;">
      <a href="${appUrl}/newsletter/unsubscribe?email={{email}}">Cancelar inscrição</a>
    </p>
  </div>
</body></html>`.trim();
}

/** Envia newsletter em background — falhas não revertem publicação. */
export function scheduleNewsletterForPost(deps: {
  pool: Pool;
  mail: MailClient;
  appUrl: string;
  post: PostRow;
}): void {
  const { pool, mail, appUrl, post } = deps;
  void (async () => {
    try {
      const { rows: subscribers } = await pool.query<{ id: string; email: string; name: string | null }>(
        `SELECT id, email, name FROM newsletter_subscribers WHERE status = 'active'`,
      );
      if (subscribers.length === 0) return;

      const htmlTemplate = buildPostNewsletterHtml(post, appUrl);
      const subject = `Novo artigo: ${post.title}`;

      const { rows: campaigns } = await pool.query<{ id: string }>(
        `INSERT INTO newsletter_campaigns (name, subject, html_content, post_id, status, total_recipients)
         VALUES ($1, $2, $3, $4, 'sending', $5) RETURNING id`,
        [`Post: ${post.title}`, subject, htmlTemplate, post.id, subscribers.length],
      );
      const campaignId = campaigns[0]?.id;
      if (!campaignId) return;

      let sent = 0;
      const BATCH = 20;
      for (let i = 0; i < subscribers.length; i += BATCH) {
        const batch = subscribers.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (sub) => {
            const html = htmlTemplate.replace(/\{\{email\}\}/g, encodeURIComponent(sub.email));
            try {
              await mail.sendBusinessEmail({
                to: sub.email,
                subject,
                html,
                tag: 'blog-newsletter',
              });
              await pool.query(
                `INSERT INTO newsletter_sends (campaign_id, subscriber_id, status, sent_at)
                 VALUES ($1, $2, 'sent', NOW())`,
                [campaignId, sub.id],
              );
              sent++;
            } catch {
              await pool.query(
                `INSERT INTO newsletter_sends (campaign_id, subscriber_id, status, error_message)
                 VALUES ($1, $2, 'failed', 'send_error')`,
                [campaignId, sub.id],
              );
            }
          }),
        );
      }

      await pool.query(
        `UPDATE newsletter_campaigns SET status = 'sent', sent_count = $1, sent_at = NOW() WHERE id = $2`,
        [sent, campaignId],
      );
    } catch (err) {
      console.error('[blogNewsletter]', err);
    }
  })();
}
