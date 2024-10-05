import fs from 'fs';
import puppeteer from 'puppeteer';

import logger from '../config/logger';

// Function to convert HTML file to PDF
export const convertHtmlToPdf = async (htmlFilePath: string, outputPath: string): Promise<void> => {
    try {
        // Read the HTML content from the file
        const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        logger.info('HTML content read successfully.');

        // Create a browser instance
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', // Disable sandboxing for non-root users
                '--disable-setuid-sandbox', // Disable setuid sandbox
                '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm
                '--single-process', // Run in a single process
                '--no-zygote', // Disable the zygote process
                '--disable-gpu', // Disable GPU hardware acceleration
            ],
            timeout: 60000, // Increase the timeout to 60 seconds
        });

        // Create a new page
        const page = await browser.newPage();
        logger.info('Browser instance and new page created.');

        // Log console messages
        page.on('console', (msg) => logger.info('PAGE LOG:', msg.text()));

        // Set viewport size
        await page.setViewport({ width: 1200, height: 800 });

        // Set HTML content
        await page.setContent(htmlContent, { waitUntil: 'networkidle2', timeout: 60000 });
        logger.info('HTML content set on the page.');

        // To reflect CSS used for screens instead of print
        await page.emulateMediaType('screen');

        // Wait for a short period to ensure rendering
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logger.info('Waited for 1 second to ensure rendering.');

        // Generate the PDF with zero padding
        await page.pdf({
            path: outputPath,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
            printBackground: true,
            format: 'A4',
        });

        // Close the browser instance
        await browser.close();
        logger.info(`PDF saved successfully to ${outputPath}`);
    } catch (error) {
        logger.error('Error converting HTML file to PDF:', error);
    }
};

// Function to convert HTML to PDF buffer
export const convertHtmlToPdfBuffer = async (html: string): Promise<Buffer> => {
    let browser;
    try {
        // Create a browser instance
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', // Disable sandboxing for non-root users
                '--disable-setuid-sandbox', // Disable setuid sandbox
            ],
        });

        // Create a new page
        const page = await browser.newPage();

        // Set the HTML content and wait for it to fully load (networkidle0 ensures full idle)
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Generate the PDF buffer
        const pdfBuffer = await page.pdf({
            format: 'A4', // Standard A4 format
            printBackground: true, // Include background graphics
            preferCSSPageSize: true, // Respect CSS @page size rules
        });

        // Close the browser instance
        await browser.close();

        return pdfBuffer;
    } catch (error) {
        if (browser) {
            await browser.close(); // Ensure the browser is closed in case of an error
        }
        throw error;
    }
};

// Ensure convertHtmlToPdfBuffer is exported for use in other modules
module.exports = { convertHtmlToPdf, convertHtmlToPdfBuffer };
