import Joi from 'joi';

const addressValidationSchema = Joi.object({
    _id: Joi.string().allow('', null).optional(),
    name: Joi.string().trim().allow('', null).optional(),
    phone: Joi.string().trim().allow('', null).optional(),
    street: Joi.string().trim().allow('', null).optional(),
    city: Joi.string().trim().allow('', null).optional(),
    state: Joi.string().trim().allow('', null).optional(),
    postalCode: Joi.string().trim().allow('', null).optional(),
    country: Joi.string().trim().allow('', null).default('India').optional(),
    isDefault: Joi.boolean().default(false).optional(),
});

export function validateCreate(data) {
    const schema = Joi.object({
        firstName: Joi.string().trim().min(1).max(100).required().label('First Name'),
        lastName: Joi.string().trim().max(100).allow('', null).optional().label('Last Name'),
        email: Joi.string().trim().email().required().label('Email Address'),
        phone: Joi.string().trim().max(20).allow('', null).optional().label('Phone Number'),
        avatar: Joi.alternatives()
            .try(
                Joi.object({
                    url: Joi.string().trim().allow('', null).optional(),
                    key: Joi.string().trim().allow('', null).optional(),
                }),
                Joi.string().trim().allow('', null)
            )
            .optional(),
        status: Joi.string().valid('active', 'inactive', 'blocked').default('active').optional().label('Status'),
        notes: Joi.string().trim().max(1000).allow('', null).optional().label('Notes'),
        tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().trim()).optional(),
        addresses: Joi.array().items(addressValidationSchema).optional(),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        firstName: Joi.string().trim().min(1).max(100).optional().label('First Name'),
        lastName: Joi.string().trim().max(100).allow('', null).optional().label('Last Name'),
        email: Joi.string().trim().email().optional().label('Email Address'),
        phone: Joi.string().trim().max(20).allow('', null).optional().label('Phone Number'),
        avatar: Joi.alternatives()
            .try(
                Joi.object({
                    url: Joi.string().trim().allow('', null).optional(),
                    key: Joi.string().trim().allow('', null).optional(),
                }),
                Joi.string().trim().allow('', null)
            )
            .optional(),
        status: Joi.string().valid('active', 'inactive', 'blocked').optional().label('Status'),
        notes: Joi.string().trim().max(1000).allow('', null).optional().label('Notes'),
        tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().trim()).optional(),
        addresses: Joi.array().items(addressValidationSchema).optional(),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateChangeStatus(data) {
    const schema = Joi.object({
        status: Joi.string().valid('active', 'inactive', 'blocked').required().label('Status'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
