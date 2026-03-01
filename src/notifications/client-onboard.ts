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
    try {
        await transporter.sendMail({
            from: `"Ampli5" <${ENV.EMAIL_USER}>`,
            to: NOTIFY_RECIPIENTS.join(', '),
            subject: payload.subject,
            text: payload.summary,
            html: payload.summary.replace(/\n/g, '<br/>'),
        });
        logger.info(`New client onboard notification sent: ${payload.formType} – ${payload.subject}`);
        return { sent: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`sendClientOnboardNotification error: ${message}`);
        return { sent: false, error: message };
    }
}
