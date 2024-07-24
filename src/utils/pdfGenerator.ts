import fs from 'fs';
import puppeteer from 'puppeteer';

import logger from '../config/logger';
// TODO: implement factory method
// TODO: CHeck the email that is being used.
export const convertHtmlToPdf = async (htmlFilePath: string, outputPath: string) => {
	try {
		// Read the HTML content from the file
		const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
		logger.info('HTML content read successfully.');

		// Create a browser instance
		const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		timeout: 60000 // Increase the timeout to 60 seconds
		});

		// Create a new page
		const page = await browser.newPage();
		logger.info('Browser instance and new page created.');

		// Log console messages
		page.on('console', msg => logger.info('PAGE LOG:', msg.text()));

		// Set viewport size
		await page.setViewport({ width: 1200, height: 800 });

		// Set HTML content
		await page.setContent(htmlContent, { waitUntil: 'networkidle2', timeout: 60000 });
		logger.info('HTML content set on the page.');

		// To reflect CSS used for screens instead of print
		await page.emulateMediaType('screen');

		// Wait for a short period to ensure rendering
		await new Promise(resolve => setTimeout(resolve, 1000));
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
		logger.error("Error converting HTML file to PDF:", error);
	}
};


// Function to convert HTML to PDF buffer
export const convertHtmlToPdfBuffer = async (html: string): Promise<Buffer> => {
	try {
		// Create a browser instance
		const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		timeout: 60000 // Increase the timeout to 60 seconds
		});

		// Create a new page
		const page = await browser.newPage();
		logger.info('Browser instance and new page created.');

		// Log console messages
		page.on('console', msg => logger.info('PAGE LOG:', msg.text()));

		// Set viewport size
		await page.setViewport({ width: 1200, height: 800 });

		// Set HTML content
		await page.setContent(html, { waitUntil: 'networkidle2', timeout: 60000 });
		logger.info('HTML content set on the page.');

		// To reflect CSS used for screens instead of print
		await page.emulateMediaType('screen');

		// Wait for a short period to ensure rendering
		await new Promise(resolve => setTimeout(resolve, 1000));
		logger.info('Waited for 1 second to ensure rendering.');

		// Generate the PDF buffer
		const pdfBuffer = await page.pdf({
		margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
		printBackground: true,
		format: 'A4',
		});

		// Close the browser instance
		await browser.close();
		logger.info('PDF buffer generated successfully.');

		return pdfBuffer; 
	} catch (error) {
		logger.error('Error converting HTML to PDF buffer:', error);
		throw error;
	}
};


module.exports = { convertHtmlToPdfBuffer };
