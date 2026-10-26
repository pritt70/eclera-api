import Joi from 'joi';

const objectId = Joi.string()
    .hex()
    .length(24)
    .messages({ 'string.length': 'Invalid ObjectId format', 'string.hex': 'Invalid ObjectId format' });

export function validateCreate(data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(250).required().label('Product Name'),
        slug: Joi.string().trim().max(250).allow('', null).optional().label('Slug'),
        sku: Joi.string().trim().max(100).allow('', null).optional().label('SKU'),
        barcode: Joi.string().trim().max(100).allow('', null).optional().label('Barcode'),
        category: objectId.required().label('Category'),
        collections: Joi.array().items(objectId).optional().default([]).label('Collections'),
        description: Joi.string().trim().allow('', null).optional().label('Description'),
        price: Joi.number().min(0).required().label('Price'),
        comparePrice: Joi.number().min(0).allow(null).optional().default(0).label('Compare Price'),
        costPrice: Joi.number().min(0).allow(null).optional().default(0).label('Cost Price'),
        stock: Joi.number().integer().min(0).allow(null).optional().default(0).label('Stock'),
        trackStock: Joi.boolean().optional().default(true).label('Track Stock'),
        images: Joi.array()
            .items(
                Joi.alternatives().try(
                    Joi.object({
                        url: Joi.string().allow('', null).optional(),
                        publicUrl: Joi.string().allow('', null).optional(),
                        key: Joi.string().allow('', null).optional(),
                    }).unknown(true),
                    Joi.string().allow('', null)
                )
            )
            .optional()
            .default([])
            .label('Images'),
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
                        specificationId: Joi.alternatives().try(objectId, Joi.string()).required(),
                        selectedOptionIds: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).default([]).optional(),
                        options: Joi.array().optional(),
                        specification: Joi.any().optional(),
                    })
                )
            )
            .optional()
            .default([])
            .label('Specifications'),
        relatedProducts: Joi.array().items(objectId).optional().default([]).label('Related Products'),
        group: Joi.object({
            enabled: Joi.boolean().default(false).optional(),
            groupId: Joi.string().trim().allow('', null).optional(),
            groupTitle: Joi.string().trim().allow('', null).optional(),
            attributeName: Joi.string().trim().allow('', null).optional(),
            attributeValue: Joi.string().trim().allow('', null).optional(),
            swatchColor: Joi.string().trim().allow('', null).optional(),
            swatchImage: Joi.object({
                url: Joi.string().allow('', null).optional(),
                publicUrl: Joi.string().allow('', null).optional(),
                key: Joi.string().allow('', null).optional(),
            }).unknown(true).optional(),
            linkedProducts: Joi.array().items(objectId).optional().default([]),
        })
            .optional()
            .default({}),
        status: Joi.string().valid('active', 'inactive').default('active').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).default(0).optional().label('Sort Order'),
        seoTitle: Joi.string().trim().max(250).allow('', null).optional().label('SEO Title'),
        seoDescription: Joi.string().trim().max(600).allow('', null).optional().label('SEO Description'),
        flipkartUrl: Joi.string().trim().allow('', null).optional().label('Flipkart URL'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(250).optional().label('Product Name'),
        slug: Joi.string().trim().max(250).allow('', null).optional().label('Slug'),
        sku: Joi.string().trim().max(100).allow('', null).optional().label('SKU'),
        barcode: Joi.string().trim().max(100).allow('', null).optional().label('Barcode'),
        category: objectId.optional().label('Category'),
        collections: Joi.array().items(objectId).optional().label('Collections'),
        description: Joi.string().trim().allow('', null).optional().label('Description'),
        price: Joi.number().min(0).optional().label('Price'),
        comparePrice: Joi.number().min(0).allow(null).optional().label('Compare Price'),
        costPrice: Joi.number().min(0).allow(null).optional().label('Cost Price'),
        stock: Joi.number().integer().min(0).allow(null).optional().label('Stock'),
        trackStock: Joi.boolean().optional().label('Track Stock'),
        images: Joi.array()
            .items(
                Joi.alternatives().try(
                    Joi.object({
                        url: Joi.string().allow('', null).optional(),
                        publicUrl: Joi.string().allow('', null).optional(),
                        key: Joi.string().allow('', null).optional(),
                    }).unknown(true),
                    Joi.string().allow('', null)
                )
            )
            .optional()
            .label('Images'),
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
                        specificationId: Joi.alternatives().try(objectId, Joi.string()).required(),
                        selectedOptionIds: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).default([]).optional(),
                        options: Joi.array().optional(),
                        specification: Joi.any().optional(),
                    })
                )
            )
            .optional()
            .label('Specifications'),
        relatedProducts: Joi.array().items(objectId).optional().label('Related Products'),
        group: Joi.object({
            enabled: Joi.boolean().optional(),
            groupId: Joi.string().trim().allow('', null).optional(),
            groupTitle: Joi.string().trim().allow('', null).optional(),
            attributeName: Joi.string().trim().allow('', null).optional(),
            attributeValue: Joi.string().trim().allow('', null).optional(),
            swatchColor: Joi.string().trim().allow('', null).optional(),
            swatchImage: Joi.object({
                url: Joi.string().allow('', null).optional(),
                publicUrl: Joi.string().allow('', null).optional(),
                key: Joi.string().allow('', null).optional(),
            }).unknown(true).optional(),
            linkedProducts: Joi.array().items(objectId).optional(),
        }).optional(),
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).optional().label('Sort Order'),
        seoTitle: Joi.string().trim().max(250).allow('', null).optional().label('SEO Title'),
        seoDescription: Joi.string().trim().max(600).allow('', null).optional().label('SEO Description'),
        flipkartUrl: Joi.string().trim().allow('', null).optional().label('Flipkart URL'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateStatus(data) {
    const schema = Joi.object({
        id: objectId.required().label('Product ID'),
        status: Joi.string().valid('active', 'inactive').required().label('Status'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateReorder(data) {
    const schema = Joi.object({
        items: Joi.array()
            .items(
                Joi.object({
                    id: objectId.required(),
                    sortOrder: Joi.number().integer().min(0).required(),
                })
            )
            .min(1)
            .required()
            .label('Reorder Items'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
