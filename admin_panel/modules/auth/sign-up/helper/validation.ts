import Joi from "joi";

export function validate(data: any) {
    const schema = Joi.object({
        name: Joi.string().trim().required().label('Name'),
        email: Joi.string().email().trim().required().label('Email'),
        password: Joi.string().min(6).required().label('Password'),
        repeat_password: Joi.any()
            .valid(Joi.ref('password'))
            .required()
            .label('Repeat Password')
            .messages({ 'any.only': 'Passwords do not match' }),
    });

    return schema.validate(data, { abortEarly: false, allowUnknown: true });
}
