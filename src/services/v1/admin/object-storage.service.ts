import AWS from 'aws-sdk';
import { ENV } from '../../../config/env';

const BUCKET = ENV.AWS_S3_BUCKET_NAME;
const MEDIA_PREFIX = 'media/';

function getClient(): AWS.S3 {
    const config: AWS.S3.Types.ClientConfiguration = {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        region: ENV.AWS_REGION,
        signatureVersion: 'v4',
    };
    if (ENV.S3_ENDPOINT) {
        config.endpoint = ENV.S3_ENDPOINT;
        config.s3ForcePathStyle = true;
    }
    return new AWS.S3(config);
}

/**
 * Upload a file to object storage. Key will be MEDIA_PREFIX + keySuffix.
 */
export async function uploadToStorage(keySuffix: string, body: Buffer, contentType: string): Promise<string> {
    const key = keySuffix.startsWith(MEDIA_PREFIX) ? keySuffix : MEDIA_PREFIX + keySuffix;
    const client = getClient();
    await client
        .putObject({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        })
        .promise();
    return key;
}

/**
 * Delete an object by key (full key or suffix).
 */
export async function deleteFromStorage(keyOrSuffix: string): Promise<void> {
    const key = keyOrSuffix.startsWith(MEDIA_PREFIX) ? keyOrSuffix : MEDIA_PREFIX + keyOrSuffix;
    const client = getClient();
    await client.deleteObject({ Bucket: BUCKET, Key: key }).promise();
}

/**
 * List object keys by prefix (full key or suffix). Returns full storage keys.
 * NOTE: This does not generate URLs; use getPublicUrl() for that.
 */
export async function listStorageKeys(prefixOrSuffix: string, maxKeys = 1000): Promise<string[]> {
    const prefix = prefixOrSuffix.startsWith(MEDIA_PREFIX) ? prefixOrSuffix : MEDIA_PREFIX + prefixOrSuffix;
    const client = getClient();
    const out: string[] = [];

    let ContinuationToken: string | undefined = undefined;
    const safeMax = Math.max(1, Math.min(1000, maxKeys));

    while (out.length < safeMax) {
        const resp = await client
            .listObjectsV2({
                Bucket: BUCKET,
                Prefix: prefix,
                MaxKeys: Math.min(1000, safeMax - out.length),
                ContinuationToken,
            })
            .promise();

        const keys = (resp.Contents || []).map((c) => c.Key).filter((k): k is string => typeof k === 'string');
        out.push(...keys);

        if (!resp.IsTruncated || !resp.NextContinuationToken) break;
        ContinuationToken = resp.NextContinuationToken;
    }

    return out;
}

/**
 * Get a signed GET URL valid for 1 hour. Use for private buckets (e.g. Hetzner).
 */
export function getSignedGetUrl(storageKey: string, expiresInSeconds = 3600): string {
    const key = storageKey.startsWith(MEDIA_PREFIX) ? storageKey : MEDIA_PREFIX + storageKey;
    const client = getClient();
    return client.getSignedUrl('getObject', {
        Bucket: BUCKET,
        Key: key,
        Expires: expiresInSeconds,
    });
}

/**
 * Build public URL for the object (if bucket has public read). Otherwise use getSignedGetUrl.
 */
export function getPublicUrl(storageKey: string): string {
    const key = storageKey.startsWith(MEDIA_PREFIX) ? storageKey : MEDIA_PREFIX + storageKey;
    if (ENV.S3_ENDPOINT) {
        const base = ENV.S3_ENDPOINT.replace(/\/$/, '');
        return `${base}/${BUCKET}/${key}`;
    }
    return `https://${BUCKET}.s3.${ENV.AWS_REGION}.amazonaws.com/${key}`;
}
