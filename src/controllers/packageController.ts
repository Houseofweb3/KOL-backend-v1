// import { Request, Response } from 'express';
// import { parseAndSaveCSV, getPackageHeadersWithPackages } from '../services/packageService';
// import logger from '../config/logger';

// export const uploadCSV = async (req: Request, res: Response) => {
//   try {

//     const file = req.file;
//     const { admin_id } = req.body;

//     if (!file) {
//       logger.warn('File is required.');
//       return res.status(400).json({ message: 'File is required.' });
//     }

//     if (!admin_id) {
//       logger.warn('Admin ID is required.');
//       return res.status(400).json({ message: 'Admin ID is required.' });
//     }

//     const filePath = file.path;

//     await parseAndSaveCSV(filePath, admin_id, res);

//   } catch (error: any) {
//     logger.error('Error uploading CSV:', error);
//     return res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// };

// export const getPackageHeadersWithPackagesHandler = async (req: Request, res: Response) => {
//   try {
//     const packageHeaders = await getPackageHeadersWithPackages();
//     logger.info('Fetched package headers and packages successfully');
//     return res.status(200).json(packageHeaders);
//   } catch (error: any) {
//     logger.error('Failed to fetch package headers and packages:', error);
//     return res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// };
