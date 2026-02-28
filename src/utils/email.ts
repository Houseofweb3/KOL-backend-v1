import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

/** Defaults to Gmail SMTP. Set EMAIL_HOST and EMAIL_PORT for other providers. */
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false,
    auth: {
        user: ENV.EMAIL_USER,
        pass: ENV.EMAIL_PASS,
    },
});

/** Ampli5-style verification code email. expiresInMinutes is shown in the body (e.g. 10 minutes). */
export async function sendOtpEmail(to: string, code: string, expiresInMinutes: number): Promise<void> {
    if (!ENV.EMAIL_USER || !ENV.EMAIL_PASS) {
        throw new Error('Email is not configured (EMAIL_USER, EMAIL_PASS). Cannot send OTP.');
    }
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5;">
  <div style="max-width:520px; margin:0 auto; background:#fff;">
    <div style="background:#956afa; padding:24px 20px; text-align:center;">
      <span style="font-size:24px; font-weight:bold; color:#fff;">Ampli5</span>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 16px; font-size:24px; font-weight:bold; color:#111;">Verification Code</h1>
      <p style="margin:0 0 20px; font-size:16px; color:#333; line-height:1.5;">Please use the following code to complete your verification:</p>
      <div style="background:#f3f4f6; border-radius:8px; padding:20px 24px; margin:0 0 24px; text-align:center;">
        <span style="font-size:28px; font-weight:bold; color:#111; letter-spacing:4px;">${code}</span>
      </div>
      <p style="margin:0 0 20px; font-size:16px; color:#333; line-height:1.5;">This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p style="margin:0 0 24px; font-size:14px; color:#666;">If you didn't request this code, please ignore this email.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0 16px;">
      <p style="margin:0; font-size:12px; color:#9ca3af;">This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>`;
    await transporter.sendMail({
        from: `"Ampli5" <${ENV.EMAIL_USER}>`,
        to,
        subject: 'Verification Code',
        text: `Verification Code\n\nPlease use the following code to complete your verification: ${code}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.\n\nThis is an automated email. Please do not reply to this message.`,
        html,
    });
}

/** Client portal login – OTP email with client-specific styling and copy. */
export async function sendClientOtpEmail(to: string, code: string, expiresInMinutes: number): Promise<void> {
    if (!ENV.EMAIL_USER || !ENV.EMAIL_PASS) {
        throw new Error('Email is not configured (EMAIL_USER, EMAIL_PASS). Cannot send OTP.');
    }
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f0fdf4;">
  <div style="max-width:480px; margin:24px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg, #956afa 0%, #956afa 100%); padding:28px 24px; text-align:center;">
      <span style="font-size:20px; font-weight:600; color:#fff; letter-spacing:0.5px;">Client Portal</span>
      <p style="margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.9);">Sign in to your account</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 8px; font-size:22px; font-weight:700; color:#0f172a;">Your login code</h1>
      <p style="margin:0 0 24px; font-size:15px; color:#475569; line-height:1.5;">Enter this code on the website to sign in. It’s valid for <strong>${expiresInMinutes} minutes</strong>.</p>
      <div style="background:#ecfdf5; border:2px solidrgb(212, 194, 255); border-radius:12px; padding:24px; margin:0 0 24px; text-align:center;">
        <span style="font-size:32px; font-weight:700; color:#956afa; letter-spacing:6px;">${code}</span>
      </div>
      <p style="margin:0 0 20px; font-size:14px; color:#64748b;">If you didn’t request this code, you can safely ignore this email. Your account is secure.</p>
      <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0 16px;">
      <p style="margin:0; font-size:12px; color:#94a3b8;">Ampli5 Client Portal · This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
    await transporter.sendMail({
        from: `"Ampli5 Client Portal" <${ENV.EMAIL_USER}>`,
        to,
        subject: 'Your login code – Ampli5 Client Portal',
        text: `Your login code\n\nEnter this code on the website to sign in: ${code}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you didn't request this code, you can safely ignore this email.\n\nAmpli5 Client Portal · This is an automated message. Please do not reply.`,
        html,
    });
}
