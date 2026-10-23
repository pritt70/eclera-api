import Joi from 'joi';

export function validateCreate(data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(120).required().label('Name'),
        displayName: Joi.string().trim().max(120).allow('', null).optional().label('Display Name'),
        slug: Joi.string().trim().max(150).allow('', null).optional().label('Slug'),
        description: Joi.string().trim().allow('', null).optional().label('Description'),
        status: Joi.string().valid('active', 'inactive').default('active').optional().label('Status'),
        is_veriant: Joi.boolean().default(false).optional().label('Is Variant'),
        is_variant: Joi.boolean().default(false).optional().label('Is Variant'),
        isVariant: Joi.boolean().optional(),
        sortOrder: Joi.number().integer().min(0).default(0).optional().label('Sort Order'),
        options: Joi.array()
            .items(
                Joi.alternatives().try(
                    Joi.string().trim().min(1).max(120),
                    Joi.object({
                        _id: Joi.string().allow('', null).optional(),
                        name: Joi.string().trim().min(1).max(120).required(),
                    })
                )
            )
            .optional()
            .label('Options'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        id: Joi.string().hex().length(24).optional().label('ID'),
        name: Joi.string().trim().min(1).max(120).optional().label('Name'),
        displayName: Joi.string().trim().max(120).allow('', null).optional().label('Display Name'),
        slug: Joi.string().trim().max(150).allow('', null).optional().label('Slug'),
        description: Joi.string().trim().allow('', null).optional().label('Description'),
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
        is_veriant: Joi.boolean().optional().label('Is Variant'),
        is_variant: Joi.boolean().optional().label('Is Variant'),
        isVariant: Joi.boolean().optional(),
        sortOrder: Joi.number().integer().min(0).optional().label('Sort Order'),
        options: Joi.array()
            .items(
                Joi.alternatives().try(
                    Joi.string().trim().min(1).max(120),
                    Joi.object({
                        _id: Joi.string().allow('', null).optional(),
                        name: Joi.string().trim().min(1).max(120).required(),
                        is_used: Joi.boolean().optional(),
                        isUsed: Joi.boolean().optional(),
                    })
                )
            )
            .optional()
            .label('Options'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateOption(data) {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(120).required().label('Option Name'),
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
