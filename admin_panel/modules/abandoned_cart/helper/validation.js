import Joi from 'joi';

const itemSchema = Joi.object({
    product: Joi.string().allow('', null).optional(),
    productName: Joi.string().trim().required().messages({
        'any.required': 'Product name is required',
    }),
    variantName: Joi.string().trim().allow('').optional(),
    price: Joi.number().min(0).required().messages({
        'any.required': 'Price is required',
    }),
    quantity: Joi.number().integer().min(1).default(1),
    subtotal: Joi.number().min(0).optional(),
    image: Joi.string().allow('').optional(),
});

export const validateCreateCart = (data) => {
    const schema = Joi.object({
        cartNumber: Joi.string().trim().uppercase().optional(),
        customer: Joi.object({
            customerId: Joi.string().allow('', null).optional(),
            name: Joi.string().trim().required().messages({
                'any.required': 'Customer name is required',
            }),
            email: Joi.string().trim().email().required().messages({
                'any.required': 'Valid customer email is required',
            }),
            phone: Joi.string().trim().allow('').optional(),
        }).required(),
        items: Joi.array().items(itemSchema).min(1).required().messages({
            'array.min': 'Cart must contain at least 1 item',
        }),
        cartTotal: Joi.number().min(0).optional(),
        recoveryStatus: Joi.string().valid('abandoned', 'email_sent', 'recovered', 'expired').default('abandoned'),
        checkoutStep: Joi.string().valid('cart', 'contact_info', 'shipping_address', 'payment_pending').default('cart'),
        notes: Joi.string().trim().allow('').optional(),
    });

    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

export const validateChangeStatus = (data) => {
    const schema = Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'Cart ID is required',
        }),
        recoveryStatus: Joi.string().valid('abandoned', 'email_sent', 'recovered', 'expired').required().messages({
            'any.required': 'Recovery status is required',
        }),
    });

    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};
