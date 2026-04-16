import HttpStatus from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../../../config/env';
import { BLOG_PUBLIC_OBJECT_KEY_PREFIX, BLOG_PUBLIC_UPLOAD_FOLDER } from '../../../constants/blog';
import { uploadToStorage, deleteFromStorage, getPublicUrl } from '../admin/object-storage.service';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
]);

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/**
 * Parse a returned public (or path-style) object URL back to the storage key.
 * Only keys under `media/blog-public/` are accepted (delete safety).
 */
export function extractBlogPublicImageKeyFromUrl(urlString: string): string | null {
    const raw = urlString.trim();
    if (!raw) return null;
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        return null;
    }
    const bucket = ENV.AWS_S3_BUCKET_NAME;
    let pathname = u.pathname;
    try {
        pathname = decodeURIComponent(pathname);
    } catch {
        /* use raw pathname */
    }
    pathname = pathname.replace(/\/$/, '');

    if (bucket && pathname.startsWith(`/${bucket}/`)) {
        const isPathStyle =
            (ENV.S3_ENDPOINT && u.href.startsWith(ENV.S3_ENDPOINT)) ||
            (u.hostname.startsWith('s3.') && u.hostname.includes('amazonaws.com'));
        if (isPathStyle || ENV.S3_ENDPOINT) {
            const key = pathname.slice(`/${bucket}/`.length);
            if (key.startsWith(BLOG_PUBLIC_OBJECT_KEY_PREFIX)) return key;
        }
    }

    if (bucket && (u.hostname === `${bucket}.s3.${ENV.AWS_REGION}.amazonaws.com` || u.hostname.startsWith(`${bucket}.s3.`))) {
        const key = pathname.replace(/^\//, '');
        if (key.startsWith(BLOG_PUBLIC_OBJECT_KEY_PREFIX)) return key;
    }

    const noLeading = pathname.replace(/^\//, '');
    if (noLeading.startsWith(BLOG_PUBLIC_OBJECT_KEY_PREFIX)) return noLeading;

    return null;
}

export async function uploadBlogPublicImage(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}): Promise<{ url: string; key: string }> {
    if (!IMAGE_MIMES.has(file.mimetype)) {
        const err = new Error('Only images allowed (JPEG, PNG, GIF, WebP, SVG).');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (file.size > IMAGE_MAX_BYTES) {
        const err = new Error('Image too large (max 10MB).');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    const suffix = sanitizeFilename(file.originalname) || 'image';
    const keySuffix = `${BLOG_PUBLIC_UPLOAD_FOLDER}/${uuidv4()}_${suffix}`;
    const storageKey = await uploadToStorage(keySuffix, file.buffer, file.mimetype);
    if (!storageKey.startsWith(BLOG_PUBLIC_OBJECT_KEY_PREFIX)) {
        const err = new Error('Unexpected storage key for blog image');
        (err as { status?: number }).status = HttpStatus.INTERNAL_SERVER_ERROR;
        throw err;
    }
    return {
        url: getPublicUrl(storageKey),
        key: storageKey,
    };
}

export async function deleteBlogPublicImageByUrl(url: string): Promise<{ deleted: true }> {
    const key = extractBlogPublicImageKeyFromUrl(url);
    if (!key) {
        const err = new Error('Invalid URL or not a blog public image URL for this bucket.');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    await deleteFromStorage(key);
    return { deleted: true };
}
