import crypto from 'crypto';
import { ENV } from '../config/env';

/**
 * AES-256-GCM encryption for long-lived OAuth tokens at rest.
 *
 * TOKEN_ENC_KEY must be 32 bytes encoded as 64 hex chars. Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Output format: `iv:authTag:cipherText`, all hex. Never log the plaintext token.
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // standard GCM nonce length

function getKey(): Buffer {
    const key = ENV.TOKEN_ENC_KEY;
    if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
        const err = new Error('TOKEN_ENC_KEY must be a 64-character hex string (32 bytes)') as Error & { status?: number };
        err.status = 500;
        throw err;
    }
    return Buffer.from(key, 'hex');
}

export function encryptToken(plainText: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) {
        throw new Error('Invalid encrypted token format');
    }
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
}
