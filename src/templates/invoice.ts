import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export const convertHtmlToPdf = async (htmlFilePath: string, outputPath: string) => {
  try {
    // Read the HTML content from the file
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

    // Create a browser instance
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000 // Increase the timeout to 60 seconds
    });

    // Create a new page
    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

    // To reflect CSS used for screens instead of print
    await page.emulateMediaType('screen');

    // Wait for a specific element to ensure the content is fully loaded
    await page.waitForSelector('.flex', { timeout: 60000 });

    // Generate the PDF with zero padding
    await page.pdf({
      path: outputPath,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      printBackground: true,
      format: 'A4',
    });

    // Close the browser instance
    await browser.close();

    console.log(`PDF saved successfully to ${outputPath}`);
  } catch (error) {
    console.error("Error converting HTML file to PDF:", error);
  }
};

// Specify the HTML file path
const htmlFilePath: string = 'D:\\Company Projects\\HOW3\\KOL-Tool\\KOL-backend-v1\\src\\templates\\A4.html';

// Derive the PDF output path
const outputPath: string = path.join(path.dirname(htmlFilePath), 'A4.pdf');

// Call the function
convertHtmlToPdf(htmlFilePath, outputPath);
