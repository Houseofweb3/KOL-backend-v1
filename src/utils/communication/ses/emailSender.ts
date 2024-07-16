import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env.example file
dotenv.config({ path: '.env.example' });

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
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
 * @param {string} pdfFilePath - Path to the PDF attachment
 * @returns {Promise} - Result of the email sending
 */
export async function sendInvoiceEmail(user: any, pdfFilePath: string): Promise<any> {
  // Check if username is null or undefined and replace it with a default value if necessary
  const username = user.fullname || "Valued Customer";

  const info = await transporter.sendMail({
    from: '"HOW3 invoice" <partnerships@houseofweb3.com>', // sender address
    to: [user.email], // recipient email address
    subject: "Your QuicKOL Order# is now Open", // Subject line
    text: `Hello ${username}, We are delighted to inform you that your KOL List order has been successfully received. Attached, you will find the draft copy of the list. Our team is currently reviewing the list to ensure it meets our stringent quality standards. You can expect to receive the final list within the next 24 business hours. We will keep you updated on the progress and notify you once the list is confirmed and ready for your review. Thank you for your patience and cooperation. Best regards, House of Web3`, // plain text body
    html: `<p>Hello ${username},</p>
        <p>We are delighted to inform you that your KOL List order has been successfully received. Attached, you will find the draft copy of the list.</p>
        <p>Our team is currently reviewing the list to ensure it meets our stringent quality standards. You can expect to receive the final list within the next 24 business hours.</p>
        <p>We will keep you updated on the progress and notify you once the list is confirmed and ready for your review.</p>
        <p>Thank you for your patience and cooperation.</p>
        <p>Best regards,</p>
        <p>House of Web3</p>`, // html body
    attachments: [
      {
        filename: `HOW3x${username}.pdf`,
        path: pdfFilePath,
      },
    ],
  });

  console.log("Message sent: %s", info.messageId);
  return info;
}
