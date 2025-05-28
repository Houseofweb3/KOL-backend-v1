// src/utils/communication/ses/emailSender.ts

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Assumes you have a .env file in the root of your project

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BOUNTY_EMAIL_USER,
        pass: process.env.BOUNTY_EMAIL_PASS,
    },
});

/**
 * Send an email with the provided details.
 * @returns {Promise} - Result of the email sending
 */

export async function sendBookingEmail({
    name,
    email,
    telegramId,
    projectURL,
}: {
    name: string;
    email: string;
    telegramId: string;
    projectURL: string;
}): Promise<any> {
    const info = await transporter.sendMail({
        from: '"HOW3 Invoice" <partnerships@houseofweb3.com>',
        to: email,
        subject: 'Ampli5 create bounty form submit',
        html: `<p>Hi there,</p>
      
      <p>Here's is create bounty form details :</p>
      <ul>
        <li>Name: ${name}</li>
        <li>Email: ${email}</li>
        <li>TelegramId: ${telegramId}</li>
        <li>ProjectURL: ${projectURL}</li>
      </ul>
      <p>If you need any assistance, just reply to this email.</p>
      <p>- Mo from Ampli5.com</p>`,
    });

    return info;
}
