import { Request, Response } from 'express';
import { parseAndSaveCSV, getPackageHeadersWithPackages } from '../services/packageService';

export const uploadCSV = async (req: Request, res: Response) => {
  if (req.method === 'POST') {
    const file = req.file;
    const { admin_id } = req.body;

    if (!file) {
      return res.status(400).json({ message: 'File is required.' });
    }

    if (!admin_id) {
      return res.status(400).json({ message: 'Admin ID is required.' });
    }

    const filePath = file.path;

    await parseAndSaveCSV(filePath, admin_id, res);
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export const getPackageHeadersWithPackagesHandler = async (req: Request, res: Response) => {
    try {
      const packageHeaders = await getPackageHeadersWithPackages();
      res.status(200).json(packageHeaders);
    } catch (error) {
      const err = error as Error;
      console.error('Failed to fetch package headers and packages:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };