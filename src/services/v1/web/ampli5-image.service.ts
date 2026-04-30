import HttpStatus from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';
import { IsNull } from 'typeorm';
import { ENV } from '../../../config/env';
import { AMPLI5_FOLDER_NAME_REGEX, AMPLI5_OBJECT_KEY_PREFIX, AMPLI5_UPLOAD_FOLDER } from '../../../constants/ampli5';
import { AppDataSource } from '../../../config/data-source';
import { MediaFolder } from '../../../entity/media-folder.entity';
import { MediaFile } from '../../../entity/media-file.entity';
import { deleteFromStorage, getPublicUrl, listStorageKeys, uploadToStorage } from '../admin/object-storage.service';

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

const FOLDER_REPO = () => AppDataSource.getRepository(MediaFolder);
const FILE_REPO = () => AppDataSource.getRepository(MediaFile);

const AMPLI5_MEDIA_ROOT_FOLDER_NAME = AMPLI5_UPLOAD_FOLDER; // "ampli5"

export function validateAmpli5FolderName(folderName: string): string {
    const name = folderName.trim();
    if (!name || !AMPLI5_FOLDER_NAME_REGEX.test(name)) {
        const err = new Error('Invalid "folderName". Allowed: 1-64 chars of letters/numbers/underscore/hyphen, starting with letter/number.');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return name;
}

/**
 * Parse a returned public (or path-style) object URL back to the storage key.
 * Only keys under `media/ampli5/` are accepted (delete safety).
 */
export function extractAmpli5ImageKeyFromUrl(urlString: string): string | null {
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

    // Path-style: <endpoint>/<bucket>/<key>
    if (bucket && pathname.startsWith(`/${bucket}/`)) {
        const isPathStyle =
            (ENV.S3_ENDPOINT && u.href.startsWith(ENV.S3_ENDPOINT)) ||
            (u.hostname.startsWith('s3.') && u.hostname.includes('amazonaws.com'));
        if (isPathStyle || ENV.S3_ENDPOINT) {
            const key = pathname.slice(`/${bucket}/`.length);
            if (key.startsWith(AMPLI5_OBJECT_KEY_PREFIX)) return key;
        }
    }

    // Virtual-hosted: https://<bucket>.s3.<region>.amazonaws.com/<key>
    if (bucket && (u.hostname === `${bucket}.s3.${ENV.AWS_REGION}.amazonaws.com` || u.hostname.startsWith(`${bucket}.s3.`))) {
        const key = pathname.replace(/^\//, '');
        if (key.startsWith(AMPLI5_OBJECT_KEY_PREFIX)) return key;
    }

    // Raw key pasted
    const noLeading = pathname.replace(/^\//, '');
    if (noLeading.startsWith(AMPLI5_OBJECT_KEY_PREFIX)) return noLeading;

    return null;
}

async function getOrCreateAmpli5DbFolders(folderName: string): Promise<{ root: MediaFolder; child: MediaFolder }> {
    const folderRepo = FOLDER_REPO();

    let root = await folderRepo.findOne({ where: { name: AMPLI5_MEDIA_ROOT_FOLDER_NAME, parentId: IsNull() } });
    if (!root) {
        root = await folderRepo.save(folderRepo.create({ name: AMPLI5_MEDIA_ROOT_FOLDER_NAME, parentId: null }));
    }

    let child = await folderRepo.findOne({ where: { name: folderName, parentId: root.id } });
    if (!child) {
        child = await folderRepo.save(folderRepo.create({ name: folderName, parentId: root.id }));
    }

    return { root, child };
}

function getAmpli5FolderNameFromStorageKey(storageKey: string): string | null {
    // Expected: media/ampli5/<folderName>/<file>
    if (!storageKey.startsWith(AMPLI5_OBJECT_KEY_PREFIX)) return null;
    const rest = storageKey.slice(AMPLI5_OBJECT_KEY_PREFIX.length); // "<folderName>/<file>"
    const folderName = rest.split('/')[0] || '';
    if (!folderName || !AMPLI5_FOLDER_NAME_REGEX.test(folderName)) return null;
    return folderName;
}

export async function uploadAmpli5Image(input: {
    folderName: string;
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}): Promise<{ url: string; key: string }> {
    const folderName = validateAmpli5FolderName(input.folderName);

    if (!IMAGE_MIMES.has(input.mimetype)) {
        const err = new Error('Only images allowed (JPEG, PNG, GIF, WebP, SVG).');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (input.size > IMAGE_MAX_BYTES) {
        const err = new Error('Image too large (max 10MB).');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const suffix = sanitizeFilename(input.originalname) || 'image';
    const keySuffix = `${AMPLI5_UPLOAD_FOLDER}/${folderName}/${uuidv4()}_${suffix}`;
    const { child } = await getOrCreateAmpli5DbFolders(folderName);

    const storageKey = await uploadToStorage(keySuffix, input.buffer, input.mimetype);
    if (!storageKey.startsWith(AMPLI5_OBJECT_KEY_PREFIX)) {
        const err = new Error('Unexpected storage key for Ampli5 image');
        (err as { status?: number }).status = HttpStatus.INTERNAL_SERVER_ERROR;
        throw err;
    }

    const fileRepo = FILE_REPO();
    try {
        await fileRepo.save(
            fileRepo.create({
                folderId: child.id,
                name: input.originalname,
                storageKey,
                mimeType: input.mimetype,
                sizeBytes: input.size,
                type: 'image',
            })
        );
    } catch (e) {
        // Avoid orphaned storage objects if DB write fails.
        try {
            await deleteFromStorage(storageKey);
        } catch {
            /* ignore cleanup errors */
        }
        throw e;
    }

    return { url: getPublicUrl(storageKey), key: storageKey };
}

export async function deleteAmpli5ImageByKeyOrUrl(input: { key?: string; url?: string }): Promise<{ deleted: true }> {
    const rawKey = typeof input.key === 'string' ? input.key.trim() : '';
    const rawUrl = typeof input.url === 'string' ? input.url.trim() : '';

    let key: string | null = null;
    if (rawKey) {
        key = rawKey.startsWith('media/') ? rawKey : `media/${rawKey}`;
        if (!key.startsWith(AMPLI5_OBJECT_KEY_PREFIX)) key = null;
    } else if (rawUrl) {
        key = extractAmpli5ImageKeyFromUrl(rawUrl);
    }

    if (!key) {
        const err = new Error('Invalid input. Provide "key" or "url" for an Ampli5 image under media/ampli5/.');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const folderName = getAmpli5FolderNameFromStorageKey(key);

    const fileRepo = FILE_REPO();
    const folderRepo = FOLDER_REPO();

    // Best-effort DB cleanup (admin panel relies on DB, but delete should still succeed for storage-only keys).
    const file = await fileRepo.findOne({ where: { storageKey: key } });

    try {
        await deleteFromStorage(key);
    } catch {
        /* continue to remove DB record */
    }

    if (file) {
        await fileRepo.remove(file);
    }

    // If this was the last image in the folder, delete the DB folder as well.
    if (folderName) {
        const root = await folderRepo.findOne({ where: { name: AMPLI5_MEDIA_ROOT_FOLDER_NAME, parentId: IsNull() } });
        if (root) {
            const child = await folderRepo.findOne({ where: { name: folderName, parentId: root.id } });
            if (child) {
                const remainingDbCount = await fileRepo.count({ where: { folderId: child.id } });
                if (remainingDbCount === 0) {
                    // Only remove the folder if there are also no objects in storage under this prefix.
                    const prefixSuffix = `${AMPLI5_UPLOAD_FOLDER}/${folderName}/`;
                    const remainingKeys = await listStorageKeys(prefixSuffix, 1);
                    const remainingInFolder = remainingKeys.filter((k) => k.startsWith(AMPLI5_OBJECT_KEY_PREFIX));
                    if (remainingInFolder.length === 0) {
                        await folderRepo.remove(child);
                    }
                }
            }
        }
    }

    return { deleted: true };
}

export async function listAmpli5Images(input: { folderName: string; limit?: number }): Promise<{ urls: string[]; keys: string[] }> {
    const folderName = validateAmpli5FolderName(input.folderName);
    const limit = typeof input.limit === 'number' && Number.isFinite(input.limit) ? Math.floor(input.limit) : 200;
    const safeLimit = Math.max(1, Math.min(1000, limit));

    const prefix = `${AMPLI5_UPLOAD_FOLDER}/${folderName}/`; // suffix; object-storage adds media/
    const keys = await listStorageKeys(prefix, safeLimit);
    const filtered = keys.filter((k) => k.startsWith(AMPLI5_OBJECT_KEY_PREFIX));
    const urls = filtered.map((k) => getPublicUrl(k));
    return { urls, keys: filtered };
}

