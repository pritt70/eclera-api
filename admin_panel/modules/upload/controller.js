import mongoose from 'mongoose';
import {
    isR2Configured,
    isValidObjectKey,
    generatePresignedUploadUrl,
    uploadBufferToR2,
    deleteR2Object,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    ALLOWED_FOLDERS,
} from './helper/r2.js';
import { validatePresign, validateDelete } from './helper/validation.js';

const formatJoiError = (error) => {
    return error.details
        ? error.details.map((d) => d.message.replace(/"/g, '')).join(', ')
        : error.message || 'Validation failed';
};

/**
 * Generate a presigned PUT URL for Cloudflare R2
 * POST /api/admin/uploads/presign
 */
export const presign = async (req, res) => {
    try {
        const { error, value } = validatePresign(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        if (!isR2Configured()) {
            return res.status(503).json({
                status: false,
                message:
                    'Cloudflare R2 storage is not configured on the server. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in server environment.',
            });
        }

        const { fileName, contentType, folder } = value;

        const result = await generatePresignedUploadUrl({
            folder,
            fileName,
            contentType,
            expiresIn: 300, // 5 minutes
        });

        return res.status(200).json({
            status: true,
            message: 'Presigned upload URL generated successfully',
            data: result,
        });
    } catch (err) {
        console.error('[R2 Presign Error]:', err);
        return res.status(500).json({
            status: false,
            message: err.message || 'Failed to generate presigned upload URL',
        });
    }
};

/**
 * Delete an uploaded object from R2 by key
 * DELETE /api/admin/uploads or POST /api/admin/uploads/delete
 */
export const deleteUpload = async (req, res) => {
    try {
        const payload = { ...req.query, ...req.body };
        const { error, value } = validateDelete(payload);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const { key } = value;

        // Security check: Key must match allowed folders and strict UUID structure
        if (!isValidObjectKey(key)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or unauthorized object key format',
            });
        }

        if (!isR2Configured()) {
            return res.status(503).json({
                status: false,
                message: 'Cloudflare R2 storage is not configured on the server.',
            });
        }

        const force = payload.force === true || payload.force === 'true';
        const targetCategoryId = payload.categoryId ? String(payload.categoryId) : null;

        // Safety check: Prevent deleting objects currently referenced in active database records unless force=true or explicit unlinking
        if (!force) {
            try {
                const Category = mongoose.models.Category;
                if (Category) {
                    const categoryInUse = await Category.findOne({ 'image.key': key }).select('_id name');
                    if (categoryInUse) {
                        // If the category requesting deletion is the same category, allow it and clear the reference
                        if (targetCategoryId && categoryInUse._id.toString() === targetCategoryId) {
                            await Category.updateOne({ _id: categoryInUse._id }, { $set: { image: { url: '', key: '' } } });
                        } else {
                            return res.status(400).json({
                                status: false,
                                message: `Cannot delete image because it is currently used by category "${categoryInUse.name}".`,
                            });
                        }
                    }
                }

                const productsCollection = mongoose.connection.collection('products');
                const productInUse = await productsCollection.findOne({
                    $or: [
                        { 'image.key': key },
                        { 'images.key': key },
                    ],
                });
                if (productInUse) {
                    return res.status(400).json({
                        status: false,
                        message: `Cannot delete image because it is currently used by product "${productInUse.name || 'existing record'}".`,
                    });
                }
            } catch {
                // If collections are not yet queried or connection pending, proceed with R2 deletion
            }
        } else {
            // When force=true, also unlink any category using this key
            try {
                const Category = mongoose.models.Category;
                if (Category) {
                    await Category.updateMany({ 'image.key': key }, { $set: { image: { url: '', key: '' } } });
                }
            } catch {}
        }

        await deleteR2Object(key);

        return res.status(200).json({
            status: true,
            message: 'File deleted successfully',
        });
    } catch (err) {
        console.error('[R2 Delete Error]:', err);
        return res.status(500).json({
            status: false,
            message: err.message || 'Failed to delete file from Cloudflare R2',
        });
    }
};

/**
 * Direct upload image buffer to R2
 * POST /api/admin/uploads/direct
 */
export const directUpload = async (req, res) => {
    try {
        if (!isR2Configured()) {
            return res.status(503).json({
                status: false,
                message: 'Cloudflare R2 storage is not configured on the server.',
            });
        }

        const buffer = req.body;
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'No file data received in request body',
            });
        }

        const rawContentType = req.headers['content-type'] || 'image/png';
        const contentType = rawContentType.split(';')[0].trim().toLowerCase();

        if (!ALLOWED_MIME_TYPES.includes(contentType)) {
            return res.status(400).json({
                status: false,
                message: `Unsupported file type: ${contentType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
            });
        }

        if (buffer.length > MAX_FILE_SIZE) {
            return res.status(400).json({
                status: false,
                message: 'File size exceeds maximum allowed size (10MB)',
            });
        }

        const requestedFolder = String(req.query.folder || 'products').toLowerCase();
        const folder = ALLOWED_FOLDERS.includes(requestedFolder) ? requestedFolder : 'products';
        const fileName = req.query.fileName ? String(req.query.fileName) : 'image.png';

        const result = await uploadBufferToR2({
            folder,
            fileName,
            contentType,
            buffer,
        });

        return res.status(200).json({
            status: true,
            message: 'File uploaded successfully',
            data: result,
        });
    } catch (err) {
        console.error('[R2 Direct Upload Error]:', err);
        return res.status(500).json({
            status: false,
            message: err.message || 'Failed to upload file to Cloudflare R2',
        });
    }
};

export default {
    presign,
    directUpload,
    deleteUpload,
};

