import Joi from 'joi';

export function validateCreate(data) {
    const schema = Joi.object({
        title: Joi.string().trim().min(2).max(100).required().label('Policy Title'),
        slug: Joi.string().trim().lowercase().min(2).max(100).optional().label('Slug'),
        type: Joi.string().valid('shipping', 'return', 'terms', 'privacy', 'custom').default('custom').optional().label('Policy Type'),
        summary: Joi.string().trim().max(500).allow('', null).optional().label('Summary'),
        content: Joi.string().trim().min(5).required().label('Policy Content'),
        status: Joi.string().valid('active', 'inactive').default('active').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).default(0).optional().label('Sort Order'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        title: Joi.string().trim().min(2).max(100).optional().label('Policy Title'),
        slug: Joi.string().trim().lowercase().min(2).max(100).optional().label('Slug'),
        type: Joi.string().valid('shipping', 'return', 'terms', 'privacy', 'custom').optional().label('Policy Type'),
        summary: Joi.string().trim().max(500).allow('', null).optional().label('Summary'),
        content: Joi.string().trim().min(5).optional().label('Policy Content'),
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).optional().label('Sort Order'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateChangeStatus(data) {
    const schema = Joi.object({
        status: Joi.string().valid('active', 'inactive').required().label('Status'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
