import nodemailer from 'nodemailer';
import { ENV } from '../config/env';
import logger from '../config/logger';

let transporterInstance: nodemailer.Transporter | null = null;

/**
 * Get nodemailer transporter for sending notifications.
 * Uses same EMAIL_USER / EMAIL_PASS as OTP emails.
 */
export function getNotificationTransporter(): nodemailer.Transporter | null {
    if (transporterInstance) return transporterInstance;
    if (!ENV.EMAIL_USER || !ENV.EMAIL_PASS) {
        logger.warn('Notifications: EMAIL_USER or EMAIL_PASS not set; notification emails disabled.');
        return null;
    }
    transporterInstance = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: false,
        auth: {
            user: ENV.EMAIL_USER,
            pass: ENV.EMAIL_PASS,
        },
    });
    return transporterInstance;
}
