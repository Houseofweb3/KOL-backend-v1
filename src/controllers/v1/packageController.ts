import { Request, Response } from 'express';
import {
    createPackage,
    getPackageById,
    getAllPackages,
    updatePackageById,
    deletePackageById,
    parseAndSaveCSV
} from '../../services/v1/packageService';
import logger from '../../config/logger';

// Create Packge
export const createPackageHandler = async (req: Request, res: Response) => {
    const { header, cost, guaranteedFeatures } = req.body;

    if (!header || !cost || !Array.isArray(guaranteedFeatures)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const newPackage = await createPackage(header, cost, guaranteedFeatures);
        return res.status(201).json(newPackage);
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error creating package:', error);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};

// Create Package item
export const getPackageByIdHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const pkg = await getPackageById(id);
        if (!pkg) {
            return res.status(404).json({ error: 'Package not found' });
        }
        return res.status(200).json(pkg);
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error fetching package:', error);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};

// Fetch all Package and respective Package Item
export const getAllPackagesHandler = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const search = req.query.search as string || "";
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const sortField = req.query.sortField as string || 'header';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';

    try {
        const { packages, pagination } = await getAllPackages(page, limit, sortField, sortOrder, search);
        return res.status(200).json({ packages, pagination });
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error fetching packages:', error);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

// Update Package details
export const updatePackageByIdHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const updatedPackage = await updatePackageById(id, updateData);
        if (!updatedPackage) {
            return res.status(404).json({ error: 'Package not found' });
        }
        return res.status(200).json(updatedPackage);
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error updating package:', error);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

// Delte Package
export const deletePackageByIdHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await deletePackageById(id);
        return res.status(204).send({ message: "Package deleted successfully" });
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error deleting package:', error);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};

// Upload and save Package into database from cdv file
export const parseAndSaveCSVHandler = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Missing required file' });
    }

    try {
        await parseAndSaveCSV(req.file.path);
        return res.status(200).json({ message: 'CSV parsed and saved successfully' });
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error parsing and saving CSV:', error);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during CSV parsing and saving');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
