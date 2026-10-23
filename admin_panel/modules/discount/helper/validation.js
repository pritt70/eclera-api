import Joi from 'joi';

export function validateCreate(data) {
    const schema = Joi.object({
        code: Joi.string().trim().uppercase().min(2).max(30).required().label('Coupon Code'),
        type: Joi.string().valid('percentage', 'fixed').default('percentage').required().label('Discount Type'),
        value: Joi.number().positive().required().label('Discount Value'),
        minOrderValue: Joi.number().min(0).default(0).optional().label('Minimum Order Value'),
        maxDiscountAmount: Joi.number().min(0).default(0).optional().label('Maximum Discount Amount'),
        startDate: Joi.date().iso().allow(null, '').optional().label('Start Date'),
        endDate: Joi.date().iso().allow(null, '').optional().label('End Date'),
        usageLimit: Joi.number().integer().min(0).default(0).optional().label('Usage Limit'),
        perCustomerLimit: Joi.number().integer().min(1).default(1).optional().label('Per Customer Limit'),
        status: Joi.string().valid('active', 'inactive').default('active').optional().label('Status'),
        isSpecial: Joi.boolean().default(false).optional().label('Special Coupon'),
        description: Joi.string().trim().max(500).allow('', null).optional().label('Description'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        code: Joi.string().trim().uppercase().min(2).max(30).optional().label('Coupon Code'),
        type: Joi.string().valid('percentage', 'fixed').optional().label('Discount Type'),
        value: Joi.number().positive().optional().label('Discount Value'),
        minOrderValue: Joi.number().min(0).optional().label('Minimum Order Value'),
        maxDiscountAmount: Joi.number().min(0).optional().label('Maximum Discount Amount'),
        startDate: Joi.date().iso().allow(null, '').optional().label('Start Date'),
        endDate: Joi.date().iso().allow(null, '').optional().label('End Date'),
        usageLimit: Joi.number().integer().min(0).optional().label('Usage Limit'),
        perCustomerLimit: Joi.number().integer().min(1).optional().label('Per Customer Limit'),
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
        isSpecial: Joi.boolean().optional().label('Special Coupon'),
        description: Joi.string().trim().max(500).allow('', null).optional().label('Description'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateChangeStatus(data) {
    const schema = Joi.object({
        status: Joi.string().valid('active', 'inactive').required().label('Status'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
