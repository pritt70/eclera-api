import Joi from 'joi';

const imageSchema = Joi.alternatives().try(
    Joi.object({
        url: Joi.string().trim().allow('', null).optional(),
        key: Joi.string().trim().allow('', null).optional(),
    }),
    Joi.string().trim().allow('', null)
);

export function validateCreate(data) {
    const schema = Joi.object({
        title: Joi.string().trim().max(150).allow('', null).optional().default('Banner').label('Banner Title'),
        subtitle: Joi.string().trim().max(300).allow('', null).optional().label('Banner Subtitle'),
        image: Joi.alternatives()
            .try(
                Joi.object({
                    url: Joi.string().trim().required().label('Image URL'),
                    key: Joi.string().trim().allow('', null).optional(),
                }),
                Joi.string().trim().min(1).required().label('Image URL')
            )
            .required()
            .label('Desktop Banner Image'),
        mobileImage: imageSchema.allow(null).optional().label('Mobile Banner Image'),
        link: Joi.string().trim().max(500).allow('', null).optional().label('Redirect Link'),
        buttonText: Joi.string().trim().max(50).allow('', null).optional().label('Button Text'),
        position: Joi.string()
            .valid('home_hero', 'home_middle', 'home_bottom', 'category_top', 'promo_popup', 'auth_popup', 'login_popup')
            .default('home_hero')
            .optional()
            .label('Position'),
        category: Joi.string().allow('', null).optional().label('Category'),
        status: Joi.string().valid('active', 'inactive').default('active').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).default(0).optional().label('Sort Order'),
        startDate: Joi.date().allow(null).optional().label('Start Date'),
        endDate: Joi.date().allow(null).optional().label('End Date'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateUpdate(data) {
    const schema = Joi.object({
        title: Joi.string().trim().min(1).max(150).optional().label('Banner Title'),
        subtitle: Joi.string().trim().max(300).allow('', null).optional().label('Banner Subtitle'),
        image: imageSchema.optional().label('Desktop Banner Image'),
        mobileImage: imageSchema.allow(null).optional().label('Mobile Banner Image'),
        link: Joi.string().trim().max(500).allow('', null).optional().label('Redirect Link'),
        buttonText: Joi.string().trim().max(50).allow('', null).optional().label('Button Text'),
        position: Joi.string()
            .valid('home_hero', 'home_middle', 'home_bottom', 'category_top', 'promo_popup', 'auth_popup', 'login_popup')
            .optional()
            .label('Position'),
        category: Joi.string().allow('', null).optional().label('Category'),
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
        sortOrder: Joi.number().integer().min(0).optional().label('Sort Order'),
        startDate: Joi.date().allow(null).optional().label('Start Date'),
        endDate: Joi.date().allow(null).optional().label('End Date'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}

export function validateChangeStatus(data) {
    const schema = Joi.object({
        status: Joi.string().valid('active', 'inactive').optional().label('Status'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
