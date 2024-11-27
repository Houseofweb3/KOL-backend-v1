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
    pdfBuffer: Buffer,
    additionalEmail?: string,
): Promise<any> {
    const username = user.fullname || 'Valued Customer';

    // Create an array of email recipients
    const toAddresses = [user.email];
    if (additionalEmail && additionalEmail !== user.email) {
        toAddresses.push(additionalEmail);
    }
    const bccEmails = ['kayaash.s@houseofweb3.com', 'mohit.ahuja@houseofweb3.com'];

    const info = await transporter.sendMail({
        from: '"HOW3 invoice" <partnerships@houseofweb3.com>',
        to: toAddresses, // Send to both emails
        bcc: bccEmails,
        subject: 'Your QuicKOL Order# is now Open',
        text: `Hello ${username},
    
We are delighted to inform you that your KOL List order has been successfully received. Attached, you will find the draft copy of the list.

Our team is currently reviewing the list to ensure it meets our stringent quality standards. You can expect to receive the final list within the next 24 business hours.

We will keep you updated on the progress and notify you once the list is confirmed and ready for your review.

Thank you for your patience and cooperation.

Best regards,
House of Web3`,
        html: `<p>Hello ${username},</p>
        <p>We are delighted to inform you that your KOL List order has been successfully received. Attached, you will find the draft copy of the list.</p>
        <p>Our team is currently reviewing the list to ensure it meets our stringent quality standards. You can expect to receive the final list within the next 24 business hours.</p>
        <p>We will keep you updated on the progress and notify you once the list is confirmed and ready for your review.</p>
        <p>Thank you for your patience and cooperation.</p>
        <p>Best regards,</p>
        <p>House of Web3</p>`,
        attachments: [
            {
                filename: `HOW3x${username}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
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
