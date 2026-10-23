import Joi from 'joi';

const itemSchema = Joi.object({
    product: Joi.string().allow('', null).optional(),
    productName: Joi.string().trim().required().messages({
        'any.required': 'Product name is required',
        'string.empty': 'Product name cannot be empty',
    }),
    variantName: Joi.string().trim().allow('').optional(),
    sku: Joi.string().trim().allow('').optional(),
    price: Joi.number().min(0).required().messages({
        'any.required': 'Price is required',
        'number.min': 'Price must be 0 or greater',
    }),
    quantity: Joi.number().integer().min(1).default(1),
    subtotal: Joi.number().min(0).optional(),
    image: Joi.string().allow('').optional(),
});

const shippingAddressSchema = Joi.object({
    name: Joi.string().trim().allow('').optional(),
    phone: Joi.string().trim().allow('').optional(),
    street: Joi.string().trim().allow('').optional(),
    city: Joi.string().trim().allow('').optional(),
    state: Joi.string().trim().allow('').optional(),
    postalCode: Joi.string().trim().allow('').optional(),
    country: Joi.string().trim().allow('').default('India'),
});

export const validateCreateOrder = (data) => {
    const schema = Joi.object({
        orderNumber: Joi.string().trim().uppercase().optional(),
        customer: Joi.object({
            customerId: Joi.string().allow('', null).optional(),
            name: Joi.string().trim().required().messages({
                'any.required': 'Customer name is required',
                'string.empty': 'Customer name cannot be empty',
            }),
            email: Joi.string().trim().email().required().messages({
                'any.required': 'Customer email is required',
                'string.email': 'Valid email is required',
            }),
            phone: Joi.string().trim().allow('').optional(),
        }).required(),
        shippingAddress: shippingAddressSchema.optional(),
        items: Joi.array().items(itemSchema).min(1).required().messages({
            'array.min': 'At least one item is required in the order',
            'any.required': 'Order items are required',
        }),
        subtotal: Joi.number().min(0).optional(),
        discountAmount: Joi.number().min(0).default(0),
        couponCode: Joi.string().trim().uppercase().allow('').optional(),
        shippingFee: Joi.number().min(0).default(0),
        totalAmount: Joi.number().min(0).optional(),
        paymentMethod: Joi.string().valid('prepaid', 'advance', 'cod', 'online', 'card', 'upi', 'netbanking').default('prepaid'),
        paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').default('pending'),
        orderStatus: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').default('pending'),
        tracking: Joi.object({
            carrier: Joi.string().trim().allow('').optional(),
            trackingNumber: Joi.string().trim().allow('').optional(),
            trackingUrl: Joi.string().trim().allow('').optional(),
        }).optional(),
        notes: Joi.string().trim().allow('').optional(),
    });

    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

export const validateUpdateOrder = (data) => {
    const schema = Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'Order ID is required',
        }),
        customer: Joi.object({
            name: Joi.string().trim().optional(),
            email: Joi.string().trim().email().optional(),
            phone: Joi.string().trim().allow('').optional(),
        }).optional(),
        shippingAddress: shippingAddressSchema.optional(),
        orderStatus: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
        paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
        paymentMethod: Joi.string().valid('prepaid', 'advance', 'cod', 'online', 'card', 'upi', 'netbanking').optional(),
        tracking: Joi.object({
            carrier: Joi.string().trim().allow('').optional(),
            trackingNumber: Joi.string().trim().allow('').optional(),
            trackingUrl: Joi.string().trim().allow('').optional(),
        }).optional(),
        notes: Joi.string().trim().allow('').optional(),
    });

    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

export const validateChangeStatus = (data) => {
    const schema = Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'Order ID is required',
        }),
        orderStatus: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
        paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    });

    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};
