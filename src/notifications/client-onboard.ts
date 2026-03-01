import { ENV } from '../config/env';
import logger from '../config/logger';
import { getNotificationTransporter } from './transporter';

const NOTIFY_RECIPIENTS = (process.env.NOTIFY_EMAIL?.split(',') ?? []).filter(Boolean) as string[];

export type ClientOnboardFormType = 'creator' | 'brand';

export interface ClientOnboardEmailPayload {
    formType: ClientOnboardFormType;
    subject: string;
    summary: string;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Send email to configured recipients (NOTIFY_EMAIL)
 * after a new client is onboarded. Call only after DB save succeeds.
 */
export async function sendClientOnboardNotification(payload: ClientOnboardEmailPayload): Promise<{ sent: boolean; error?: string }> {
    const transporter = getNotificationTransporter();
    if (!transporter) {
        logger.warn('New client onboard notification skipped: email not configured');
        return { sent: false, error: 'Email not configured' };
    }
    if (NOTIFY_RECIPIENTS.length === 0) {
        logger.warn('New client onboard notification skipped: no NOTIFY_EMAIL configured');
        return { sent: false, error: 'No recipients configured' };
    }
    const subtitle = payload.formType === 'brand' ? 'New brand intake' : 'New creator intake';
    const summarySafe = escapeHtml(payload.summary).replace(/\n/g, '<br/>');
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5;">
  <div style="max-width:520px; margin:0 auto; background:#fff;">
    <div style="background:#956afa; padding:24px 20px; text-align:center;">
      <span style="font-size:24px; font-weight:bold; color:#fff;">Ampli5</span>
      <p style="margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.9);">${escapeHtml(subtitle)}</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 16px; font-size:24px; font-weight:bold; color:#111;">${escapeHtml(payload.subject)}</h1>
      <div style="margin:0 0 24px; font-size:16px; color:#333; line-height:1.5;">${summarySafe}</div>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0 16px;">
      <p style="margin:0; font-size:12px; color:#9ca3af;">Ampli5 Team</p>
      <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">This is an automated notification. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>`;
    try {
        await transporter.sendMail({
            from: `"Ampli5" <${ENV.EMAIL_USER}>`,
            to: NOTIFY_RECIPIENTS.join(', '),
            subject: payload.subject,
            text: payload.summary,
            html,
        });
        logger.info(`New client onboard notification sent: ${payload.formType} – ${payload.subject}`);
        return { sent: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`sendClientOnboardNotification error: ${message}`);
        return { sent: false, error: message };
    }
}
