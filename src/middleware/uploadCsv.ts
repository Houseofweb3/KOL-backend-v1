import multer from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadCsvMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        const ok =
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/csv' ||
            file.originalname.toLowerCase().endsWith('.csv');
        if (ok) cb(null, true);
        else cb(new Error('Only CSV files are allowed'));
    },
}).single('file');
