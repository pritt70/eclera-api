import Joi from "joi";

export function validate(data: any) {
    const schema = Joi.object({
        email: Joi.string().email().trim().required().label('Email'),
        password: Joi.string().min(6).required().label('Password'),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}