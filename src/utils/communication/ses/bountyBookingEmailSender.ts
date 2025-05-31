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
        from: 'Ampli5  <partnerships@houseofweb3.com>',
        to: email,
        subject: 'Ampli5 Acknowledgement – Bounty Request Submission',
        bcc: 'sales@houseofweb3.com',
        html: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bounty Submission Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #FFF;
            margin: 0;
            padding: 0;
            color: #333;
        }

        .email-container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #FDF4E9;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .header {
            background-color: #008CFF;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }

        .content {
            padding: 30px;
        }

        .content p {
            line-height: 1.6;
        }

        .info-section {
            padding: 15px 0px;
            margin: 10px 0;
        }

        .footer {
            background-color: #008CFF;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #FFF;
        }

        .label {
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <div class="header">
            <h2>Thank You for Your Submission</h2>
        </div>
        <div class="content">
            <p>Dear <strong> ${name}</strong>,</p>
            <p>
                Thank you for submitting your bounty request with <strong>Ampli5</strong>.
                We have successfully received your information and our team is reviewing the details below:
            </p>

            <div class="info-section">
                <p><span class="label">Contact Person:</span> ${name}</p>
                <p><span class="label">Email:</span> ${email}</p>
                <p><span class="label">Telegram ID:</span> ${telegramId}</p>
                <p><span class="label">ProjectURL:</span> ${projectURL}</p>
            </div>

            <p>We acknowledge your interest in hosting a bounty on our platform.</p>
            <p>Before the meeting, we will be reaching out to you on Telegram for further details.</p>

            <p>Thanks,<br>
                <strong>Ampli5 Team</strong><br>
                <em>(Telegram ID - Ampli5aiBD)</em>
            </p>
        </div>
        <div class="footer">
            &copy; 2025 Ampli5. All rights reserved.
        </div>
    </div>
</body>

</html>`,
    });

    return info;
}
