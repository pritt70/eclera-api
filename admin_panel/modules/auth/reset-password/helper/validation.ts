import Joi from "joi";

export function validate(data: any) {
    const schema = Joi.object({
        booking: Joi.string().hex().length(24).required().label('Booking'),
        from_date: Joi.date().iso().required().label('From Date'),
        to_date: Joi.date().iso().required().label('To Date'),
        to_emails: Joi.array().items(Joi.string()).required(),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}