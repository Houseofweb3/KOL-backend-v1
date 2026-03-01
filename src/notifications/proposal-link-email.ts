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
    const html = `
<p>Hi ${escapeHtml(name)},</p>
<p>Your proposal is ready. Please review and confirm using the link below:</p>
<p><a href="${escapeHtml(payload.proposalUrl)}" style="color:#a762fe;font-weight:600">View & confirm proposal</a></p>
<p style="color:#6b7280;font-size:14px">Or copy this URL: ${escapeHtml(payload.proposalUrl)}</p>
<p style="color:#6b7280;font-size:14px">This link is valid for one-time use.</p>
<p>Best regards,<br/>Ampli5 Team</p>
`;
    try {
        await transporter.sendMail({
            from: `"Ampli5" <${ENV.EMAIL_USER}>`,
            to: payload.toEmail.trim(),
            subject,
            text,
            html,
        });
        logger.info(`Proposal link email sent to ${payload.toEmail}`);
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
