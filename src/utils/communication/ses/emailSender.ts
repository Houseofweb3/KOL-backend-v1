// src/utils/communication/ses/emailSender.ts

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config(); // Assumes you have a .env file in the root of your project

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});




/**
 * Send an email with the provided details.
 *
 * @param {Object} user - User details
 * @param {Buffer} pdfBuffer - Buffer containing the PDF data
 * @returns {Promise} - Result of the email sending
 */
export async function sendInvoiceEmail(
    user: any,
    pdfBuffer?: Buffer,  // Optional buffer for direct attachment
    s3Link?: string,      // Optional S3 link for external attachment
    additionalEmail?: string,
    proposalEmailText?: any,
    proposalEmailHtml?: any,
    emailFileName?: any,
    emailsubject?: any
): Promise<any> {
    // Create an array of email recipients
    const toAddresses = [user.email];
    console.log('user.email', user.email);
    console.log('additionalEmail', additionalEmail);
    if (additionalEmail && additionalEmail !== user.email) {
        toAddresses.push(additionalEmail);
    }
    const bccEmails = ['kayaash.s@houseofweb3.com', 'mohit.ahuja@houseofweb3.com', 'uditsingh.t@houseofweb3.com'];

    // Build attachments array dynamically
    const attachments = [];

    if (pdfBuffer) {
        attachments.push({
            filename: emailFileName || 'invoice.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
        });
    } else if (s3Link) {
        attachments.push({
            filename: emailFileName || 'invoice.pdf',
            path: s3Link, // Links to the external S3 file
        });
    }

    const info = await transporter.sendMail({
        from: '"HOW3 Invoice" <partnerships@houseofweb3.com>',
        to: toAddresses,
        bcc: bccEmails,
        subject: emailsubject,
        text: proposalEmailText,
        html: proposalEmailHtml,
        attachments, // Include attachments if available
    });

    console.log('Invoice email sent: %s', info.messageId);
    console.log('Sent to:', toAddresses.join(', '));
    return info;
}

/**
 * Send a welcome email to the new user.
 *
 * @param {string} email - Recipient email address
 * @returns {Promise} - Result of the email sending
 */
export async function sendWelcomeEmail(email: string): Promise<any> {
    const info = await transporter.sendMail({
        from: '"Ampli5" <info@ampli5.com>', // Sender address
        to: [email], // Recipient email address
        subject: 'Welcome to Ampli5 - AI-powered Crypto KOL/PR packages', // Subject line
        text: `Hi there,
    Mo here from Ampli5. Thanks for taking the time to check us out.
    Here's our promise:
    Ampli5 will:
    - Help you build an Influencer (KOL) and PR list for your Crypto project in under 5 minutes
    - Get your campaign launched and do the heavy lifting of coordinating with KOLs and PR houses
    - Have the first KOL / PR post up in under 72 hours

    If you need any assistance, just drop us a hi at [email ID].
    - Mo from Ampli5.com`,
        html: `<p>Hi there,</p>
      <p>Mo here from Ampli5. Thanks for taking the time to check us out.</p>
      <p>Here's our promise, we:</p>
      <ul>
        <li>Help you build an Influencer (KOL) and PR list for your Crypto project in under 5 minutes</li>
        <li>Get your campaign launched and do the heavy lifting of coordinating with KOLs and PR houses</li>
        <li>Have the first KOL / PR post up in under 72 hours</li>
      </ul>
      <p>If you need any assistance, just reply to this email.</p>
      <p>- Mo from Ampli5.com</p>`,
    });

    console.log('Welcome email sent: %s', info.messageId);
    return info;
}

// send otp email
export async function sendOtpEmail(email: string, otp: string): Promise<any> {
    const info = await transporter.sendMail({
        from: '"Ampli5" <partnerships@houseofweb3.com>',
        to: email,
        subject: "Your OTP Verification Code",
        text: `Your verification code is: ${otp}. This code will expire in 5 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #007bff; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Ampli5</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                    <h2>Verification Code</h2>
                    <p>Please use the following code to complete your verification:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; background-color: #f4f4f4; border-radius: 5px;">${otp}</span>
                    </div>
                    <p>This code will expire in <strong>5 minutes</strong>.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
                </div>
            </div>
        `
    });

    console.log(`OTP email sent to ${email}: ${info.messageId}`);
    return info;
}