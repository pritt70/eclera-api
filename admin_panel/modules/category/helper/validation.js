import Joi from 'joi';

// Helper for MongoDB ObjectId string validation
const objectId = Joi.string()
    .hex()
    .length(24)
    .messages({ 'string.length': 'Invalid parent ID format', 'string.hex': 'Invalid parent ID format' });

export function validateCreate(data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(120).required().label('Name'),
        slug: Joi.string().trim().max(150).allow('', null).optional().label('Slug'),
        description: Joi.string().trim().allow('', null).optional().label('Description'),
        image: Joi.alternatives()
            .try(
                Joi.object({
                    url: Joi.string().allow('', null).optional(),
                    key: Joi.string().allow('', null).optional(),
                }),
                Joi.string().allow('', null)
            )
            .allow(null)
            .optional()
            .label('Image'),
        parent: Joi.alternatives()
            .try(objectId, Joi.string().allow('', null))
            .optional()
            .label('Parent Category'),
        status: Joi.string().valid('active', 'inactive').default('active').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).default(0).optional().label('Sort Order'),
        seoTitle: Joi.string().trim().max(200).allow('', null).optional().label('SEO Title'),
        seoDescription: Joi.string().trim().max(500).allow('', null).optional().label('SEO Description'),
        specifications: Joi.array()
            .items(
                Joi.alternatives().try(
                    objectId,
                    Joi.string().allow('', null),
                    Joi.object({
                        specification: Joi.alternatives().try(objectId, Joi.string()).required(),
                        options: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).default([]).optional(),
                    }),
                    Joi.object({
                        specification_id: Joi.alternatives().try(objectId, Joi.string()).required(),
                        options: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).default([]).optional(),
                    }),
                    Joi.object({
                        _id: Joi.string().allow('', null).optional(),
                        id: Joi.string().allow('', null).optional(),
                        options: Joi.array().optional(),
                    })
                )
            )
            .optional()
            .label('Specifications'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(120).optional().label('Name'),
        slug: Joi.string().trim().max(150).allow('', null).optional().label('Slug'),
        description: Joi.string().trim().allow('', null).optional().label('Description'),
        image: Joi.alternatives()
            .try(
                Joi.object({
                    url: Joi.string().allow('', null).optional(),
                    key: Joi.string().allow('', null).optional(),
                }),
                Joi.string().allow('', null)
            )
            .allow(null)
            .optional()
            .label('Image'),
        parent: Joi.alternatives()
            .try(objectId, Joi.string().allow('', null))
            .optional()
            .label('Parent Category'),
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).optional().label('Sort Order'),
        seoTitle: Joi.string().trim().max(200).allow('', null).optional().label('SEO Title'),
        seoDescription: Joi.string().trim().max(500).allow('', null).optional().label('SEO Description'),
        specifications: Joi.array()
            .items(
                Joi.alternatives().try(
                    objectId,
                    Joi.string().allow('', null),
                    Joi.object({
                        specification: Joi.alternatives().try(objectId, Joi.string()).required(),
                        options: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).default([]).optional(),
                    }),
                    Joi.object({
                        specification_id: Joi.alternatives().try(objectId, Joi.string()).required(),
                        options: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).default([]).optional(),
                    }),
                    Joi.object({
                        _id: Joi.string().allow('', null).optional(),
                        id: Joi.string().allow('', null).optional(),
                        options: Joi.array().optional(),
                    })
                )
            )
            .optional()
            .label('Specifications'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateChangeStatus(data) {
    const schema = Joi.object({
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export const validateToggleStatus = validateChangeStatus;

export function validateReorder(data) {
    const schema = Joi.object({
        items: Joi.array().items(
            Joi.object({
                id: Joi.string().hex().length(24).required().label('Item ID'),
                sortOrder: Joi.number().integer().min(0).required().label('Sort Order'),
            })
        ).optional(),
        order: Joi.array().items(
            Joi.string().hex().length(24).required()
        ).optional(),
    }).or('items', 'order');

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
