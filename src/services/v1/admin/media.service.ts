import HttpStatus from 'http-status-codes';
import { IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../config/data-source';
import { MediaFolder } from '../../../entity/media-folder.entity';
import { MediaFile, MediaFileType } from '../../../entity/media-file.entity';
import { uploadToStorage, deleteFromStorage, getSignedGetUrl } from './object-storage.service';
import logger from '../../../config/logger';

const FOLDER_REPO = () => AppDataSource.getRepository(MediaFolder);
const FILE_REPO = () => AppDataSource.getRepository(MediaFile);

export async function listFolders(parentId: string | null) {
    const repo = FOLDER_REPO();
    return repo.find({
        where: parentId == null ? { parentId: IsNull() } : { parentId },
        order: { name: 'ASC' },
    });
}

export async function createFolder(name: string, parentId?: string | null) {
    const repo = FOLDER_REPO();
    const folder = repo.create({ name: name.trim(), parentId: parentId ?? null });
    return repo.save(folder);
}

export async function deleteFolder(id: string) {
    const folderRepo = FOLDER_REPO();
    const fileRepo = FILE_REPO();
    const folder = await folderRepo.findOne({ where: { id }, relations: ['files'] });
    if (!folder) {
        const err = new Error('Folder not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    for (const file of folder.files || []) {
        try {
            await deleteFromStorage(file.storageKey);
        } catch (_: any) {
            /* ignore S3 errors when deleting folder */
            logger.error(`Error deleting file ${file.storageKey}: ${_.message}`);
        }
        await fileRepo.remove(file);
    }
    const subFolders = await folderRepo.find({ where: { parentId: id } });
    for (const sub of subFolders) {
        await deleteFolder(sub.id);
    }
    await folderRepo.remove(folder);
    return { deleted: true };
}

export async function listFiles(folderId: string | null) {
    const repo = FILE_REPO();
    const files = await repo.find({
        where: folderId == null ? { folderId: IsNull() } : { folderId },
        order: { createdAt: 'DESC' },
    });
    return files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        type: f.type,
        url: getSignedGetUrl(f.storageKey),
        createdAt: f.createdAt,
    }));
}

function sanitizeKey(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function uploadFile(
    folderId: string | null,
    type: MediaFileType,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
) {
    const folderRepo = FOLDER_REPO();
    const fileRepo = FILE_REPO();
    if (folderId) {
        const folder = await folderRepo.findOne({ where: { id: folderId } });
        if (!folder) {
            const err = new Error('Folder not found');
            (err as any).status = HttpStatus.NOT_FOUND;
            throw err;
        }
    }
    const fileId = uuidv4();
    const suffix = sanitizeKey(file.originalname) || 'file';
    const keySuffix = `${folderId || 'root'}/${fileId}_${suffix}`;
    const storageKey = await uploadToStorage(keySuffix, file.buffer, file.mimetype);
    const record = fileRepo.create({
        folderId,
        name: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        type,
    });
    const saved = await fileRepo.save(record);
    return {
        id: saved.id,
        name: saved.name,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        type: saved.type,
        url: getSignedGetUrl(saved.storageKey),
        createdAt: saved.createdAt,
    };
}

export async function deleteFile(id: string) {
    const repo = FILE_REPO();
    const file = await repo.findOne({ where: { id } });
    if (!file) {
        const err = new Error('File not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    try {
        await deleteFromStorage(file.storageKey);
    } catch (e) {
        /* continue to remove DB record */
    }
    await repo.remove(file);
    return { deleted: true };
}
