import Joi from 'joi';
import { ALLOWED_FOLDERS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './r2.js';

export function validatePresign(data) {
    const schema = Joi.object({
        fileName: Joi.string().trim().required().label('File Name'),
        contentType: Joi.string()
            .trim()
            .valid(...ALLOWED_MIME_TYPES)
            .required()
            .messages({
                'any.only': 'Unsupported image format. Allowed formats: JPEG, PNG, WEBP',
            })
            .label('Content Type'),
        fileSize: Joi.number()
            .integer()
            .min(1)
            .max(MAX_FILE_SIZE)
            .required()
            .messages({
                'number.max': 'File size exceeds maximum limit of 10MB',
            })
            .label('File Size'),
        folder: Joi.string()
            .trim()
            .valid(...ALLOWED_FOLDERS)
            .default('products')
            .optional()
            .label('Folder'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateDelete(data) {
    const schema = Joi.object({
        key: Joi.string().trim().required().label('Object Key'),
        force: Joi.boolean().optional(),
        categoryId: Joi.string().trim().optional(),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
