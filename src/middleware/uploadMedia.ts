import multer from 'multer';

const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DOCUMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB

const IMAGE_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];

const DOCUMENT_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ok = IMAGE_MIMES.includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only images allowed (JPEG, PNG, GIF, WebP, SVG). Max 10MB.'));
};

const documentFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ok = DOCUMENT_MIMES.includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only documents allowed (PDF, Word, Excel, TXT, CSV). Max 20MB.'));
};

const IMAGE_OR_DOCUMENT_MIMES = [...IMAGE_MIMES, ...DOCUMENT_MIMES];

/** Single middleware: accepts images (≤10MB) and documents (≤20MB). Size limit 20MB; type/size validated in controller. */
export const uploadMediaMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DOCUMENT_MAX_SIZE },
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const ok = IMAGE_OR_DOCUMENT_MIMES.includes(file.mimetype);
        if (ok) cb(null, true);
        else cb(new Error('Allowed: images (JPEG, PNG, GIF, WebP, SVG) or documents (PDF, Word, Excel, TXT, CSV).'));
    },
}).single('file');

export const uploadImageMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMAGE_MAX_SIZE },
    fileFilter: imageFilter,
}).single('file');

export const uploadDocumentMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DOCUMENT_MAX_SIZE },
    fileFilter: documentFilter,
}).single('file');
