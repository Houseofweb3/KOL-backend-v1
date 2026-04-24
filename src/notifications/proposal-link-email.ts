import { ENV } from '../config/env';
import logger from '../config/logger';
import { getNotificationTransporter } from './transporter';

export interface ProposalLinkEmailPayload {
    toEmail: string;
    clientName: string;
    proposalUrl: string;
}

/**
 * Send proposal link to client email. Call after proposal link is created.
 */
export async function sendProposalLinkEmail(payload: ProposalLinkEmailPayload): Promise<{ sent: boolean; error?: string }> {
    const transporter = getNotificationTransporter();
    if (!transporter) {
        logger.warn('Proposal link email skipped: email not configured');
        return { sent: false, error: 'Email not configured' };
    }
    if (!payload.toEmail?.trim()) {
        logger.warn('Proposal link email skipped: no client email');
        return { sent: false, error: 'No client email' };
    }
    const subject = 'Your proposal is ready – Ampli5';
    const name = payload.clientName?.trim() || 'Client';
    const text = `Hi ${name},\n\nYour proposal is ready. Please review and confirm using the link below:\n\n${payload.proposalUrl}\n\nThis link is valid for one-time use.\n\nBest regards,\nAmpli5 Team`;
    const proposalUrlSafe = escapeHtml(payload.proposalUrl);
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5;">
  <div style="max-width:520px; margin:0 auto; background:#fff;">
    <div style="background:#956afa; padding:24px 20px; text-align:center;">
      <span style="font-size:24px; font-weight:bold; color:#fff;">Ampli5</span>
      <p style="margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.9);">Your proposal is ready</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 16px; font-size:24px; font-weight:bold; color:#111;">Hi ${escapeHtml(name)},</h1>
      <p style="margin:0 0 24px; font-size:16px; color:#333; line-height:1.5;">Your proposal is ready for review. Please open the link below to view the details and confirm.</p>
      <div style="text-align:center; margin:0 0 24px;">
        <a href="${proposalUrlSafe}" style="display:inline-block; background:#956afa; color:#fff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 28px; border-radius:8px;">View & confirm proposal</a>
      </div>
      <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">Or copy this URL:</p>
      <p style="margin:0 0 24px; font-size:13px; color:#9ca3af; word-break:break-all;">${proposalUrlSafe}</p>
      <p style="margin:0 0 24px; font-size:14px; color:#6b7280;">This link is valid for one-time use.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0 16px;">
      <p style="margin:0; font-size:12px; color:#9ca3af;">Best regards,<br/>Ampli5 Team</p>
      <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>`;
    const PROPOSAL_CC = ['partnerships@houseofweb3.com', 'kolops@houseofweb3.com', 'mohit.ahuja@houseofweb3.com'];
    try {
        await transporter.sendMail({
            from: `"Ampli5" <${ENV.EMAIL_USER}>`,
            to: payload.toEmail.trim(),
            cc: PROPOSAL_CC,
            subject,
            text,
            html,
        });
        logger.info(`Proposal link email sent to ${payload.toEmail} (cc: ${PROPOSAL_CC.join(', ')})`);
        return { sent: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`sendProposalLinkEmail error: ${message}`);
        return { sent: false, error: message };
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
