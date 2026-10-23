import crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../../../../helper/config.js';

export const ALLOWED_FOLDERS = ['products', 'categories', 'banners'];
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Read R2 configuration from environment variables
 */
export const getR2Config = () => {
    const accountId = getConfig('R2_ACCOUNT_ID');
    const accessKeyId = getConfig('R2_ACCESS_KEY_ID');
    const secretAccessKey = getConfig('R2_SECRET_ACCESS_KEY');
    const bucket = getConfig('R2_BUCKET_NAME') || getConfig('R2_BUCKET');
    const publicUrl = getConfig('R2_PUBLIC_URL');

    return {
        accountId: accountId ? String(accountId).trim() : '',
        accessKeyId: accessKeyId ? String(accessKeyId).trim() : '',
        secretAccessKey: secretAccessKey ? String(secretAccessKey).trim() : '',
        bucket: bucket ? String(bucket).trim() : '',
        publicUrl: publicUrl ? String(publicUrl).trim().replace(/\/+$/, '') : '',
    };
};

/**
 * Check if all required R2 credentials are present
 */
export const isR2Configured = () => {
    const { accountId, accessKeyId, secretAccessKey, bucket } = getR2Config();
    return Boolean(accountId && accessKeyId && secretAccessKey && bucket);
};

/**
 * Initialize S3 client configured for Cloudflare R2
 */
let cachedClient = null;
export const getR2Client = () => {
    if (cachedClient) return cachedClient;

    const { accountId, accessKeyId, secretAccessKey, bucket } = getR2Config();
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error(
            'Cloudflare R2 is not configured. Missing required environment variables: ' +
            ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']
                .filter((k) => !getConfig(k))
                .join(', ')
        );
    }

    cachedClient = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    return cachedClient;
};

/**
 * Build structured object key: {folder}/{yyyy}/{uuid}.{ext}
 */
export const buildObjectKey = (requestedFolder, fileName, contentType) => {
    const folder = ALLOWED_FOLDERS.includes(requestedFolder) ? requestedFolder : 'products';
    const year = new Date().getFullYear();
    const uuid = crypto.randomUUID();

    let ext = 'webp';
    if (contentType === 'image/jpeg') ext = 'jpg';
    else if (contentType === 'image/png') ext = 'png';
    else if (contentType === 'image/webp') ext = 'webp';
    else if (fileName && typeof fileName === 'string') {
        const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
        if (match) {
            const rawExt = match[1].toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp'].includes(rawExt)) {
                ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
            }
        }
    }

    return `${folder}/${year}/${uuid}.${ext}`;
};

/**
 * Validate that a key belongs to the allowed folders and matches the strict key pattern
 */
export const isValidObjectKey = (key) => {
    if (!key || typeof key !== 'string') return false;
    const pattern = new RegExp(`^(${ALLOWED_FOLDERS.join('|')})/\\d{4}/[0-9a-fA-F-]{36}\\.(jpg|jpeg|png|webp)$`);
    return pattern.test(key);
};

/**
 * Generate a short-lived presigned PUT URL for browser direct-upload
 */
export const generatePresignedUploadUrl = async ({ folder, fileName, contentType, expiresIn = 300 }) => {
    const { bucket, publicUrl } = getR2Config();
    const client = getR2Client();

    const key = buildObjectKey(folder, fileName, contentType);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    const finalPublicUrl = publicUrl
        ? `${publicUrl}/${key}`
        : `https://${bucket}.${getR2Config().accountId}.r2.cloudflarestorage.com/${key}`;

    return {
        uploadUrl,
        key,
        publicUrl: finalPublicUrl,
    };
};

/**
 * Direct upload a buffer to R2 bucket
 */
export const uploadBufferToR2 = async ({ folder, fileName, contentType, buffer }) => {
    const { bucket, publicUrl, accountId } = getR2Config();
    const client = getR2Client();

    const key = buildObjectKey(folder, fileName, contentType);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await client.send(command);

    const finalPublicUrl = publicUrl
        ? `${publicUrl}/${key}`
        : `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`;

    return {
        key,
        publicUrl: finalPublicUrl,
    };
};

/**
 * Delete an object from R2 bucket by key
 */
export const deleteR2Object = async (key) => {
    const { bucket } = getR2Config();
    const client = getR2Client();

    const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    return client.send(command);
};

