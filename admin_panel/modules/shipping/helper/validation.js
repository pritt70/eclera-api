import Joi from 'joi';

export const validateCreateShipping = (data) => {
    const schema = Joi.object({
        title: Joi.string().trim().required().messages({
            'string.empty': 'Shipping zone title is required',
            'any.required': 'Shipping zone title is required',
        }),
        country: Joi.string().trim().default('India'),
        state: Joi.string().trim().default('All States'),
        city: Joi.string().trim().allow('').default('All Cities'),
        postalCodes: Joi.array().items(Joi.string().trim()).default([]),
        type: Joi.string().valid('free', 'paid').default('free'),
        rate: Joi.number().min(0).default(0),
        minOrderValue: Joi.number().min(0).default(0),
        estimatedDays: Joi.string().trim().allow('').default('3-5 Business Days'),
        status: Joi.string().valid('active', 'inactive').default('active'),
        notes: Joi.string().trim().allow('').default(''),
    });

    return schema.validate(data, { abortEarly: false });
};

export const validateUpdateShipping = (data) => {
    const schema = Joi.object({
        id: Joi.string().required().messages({
            'string.empty': 'Shipping zone ID is required',
            'any.required': 'Shipping zone ID is required',
        }),
        title: Joi.string().trim().required().messages({
            'string.empty': 'Shipping zone title is required',
            'any.required': 'Shipping zone title is required',
        }),
        country: Joi.string().trim().default('India'),
        state: Joi.string().trim().default('All States'),
        city: Joi.string().trim().allow('').default('All Cities'),
        postalCodes: Joi.array().items(Joi.string().trim()).default([]),
        type: Joi.string().valid('free', 'paid').default('free'),
        rate: Joi.number().min(0).default(0),
        minOrderValue: Joi.number().min(0).default(0),
        estimatedDays: Joi.string().trim().allow('').default('3-5 Business Days'),
        status: Joi.string().valid('active', 'inactive').default('active'),
        notes: Joi.string().trim().allow('').default(''),
    });

    return schema.validate(data, { abortEarly: false });
};

export const validateChangeStatus = (data) => {
    const schema = Joi.object({
        id: Joi.string().required().messages({
            'string.empty': 'Shipping zone ID is required',
            'any.required': 'Shipping zone ID is required',
        }),
        status: Joi.string().valid('active', 'inactive').required().messages({
            'any.only': 'Status must be active or inactive',
            'any.required': 'Status is required',
        }),
    });

    return schema.validate(data, { abortEarly: false });
};
