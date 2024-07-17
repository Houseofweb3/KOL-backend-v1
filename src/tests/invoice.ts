import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import ejs from 'ejs';

export const convertEjsToPdf = async (ejsFilePath: string, data: any, outputPath: string) => {
  try {
    // Read the EJS content from the file
    const ejsContent = fs.readFileSync(ejsFilePath, 'utf8');

    // Render the EJS content to HTML
    const htmlContent = ejs.render(ejsContent, data);

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
    console.error("Error converting EJS file to PDF:", error);
  }
};

// Specify the EJS file path
const ejsFilePath: string = 'D:\\Company Projects\\HOW3\\KOL-Tool\\KOL-backend-v1\\src\\templates\\A4.ejs';

// Derive the PDF output path
const outputPath: string = path.join(path.dirname(ejsFilePath), 'A4.pdf');

// Define the data to be passed to the EJS template
const data = {
  showInfluencersList: true,
  showPackagesList: true,
  influencersSubtotal: 5000,
  packagesSubtotal: 2000,
  items: [
    {
      product: {
        link: "https://example.com",
        name: "Influencer 1",
        category_name: "Category 1",
        geography: "Geography 1",
        subscribers: 100000,
        content_type: "Content Type 1",
        price: 1000
      }
    },
    {
      product: {
        link: "https://example.com",
        name: "Influencer 2",
        category_name: "Category 2",
        geography: "Geography 2",
        subscribers: 200000,
        content_type: "Content Type 2",
        price: 2000
      }
    }
  ],
  packages: [
    {
      header: "Package 1",
      packages: [
        {
          link: "https://example.com",
          media: "Media 1",
          format: "Format 1",
          monthlyTraffic: "100k"
        },
        {
          link: "https://example.com",
          media: "Media 2",
          format: "Format 2",
          monthlyTraffic: "200k"
        }
      ],
      text1: "Text 1",
      text2: "Text 2",
      text3: "Text 3",
      text4: "Text 4",
      text5: "Text 5",
      text6: "Text 6",
      text7: "Text 7",
      cost: 1500
    }
  ],
  totalExcludingTax: 7000,
  managementFee: 1750,
  total: 8750
};

// Call the function
convertEjsToPdf(ejsFilePath, data, outputPath);
