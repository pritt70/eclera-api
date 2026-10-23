import Admin from '../model.js';
import { validate } from './helper/validation.js';

export const login = async (req, res) => {
    try {
        const { error, value } = validate(req.body);
        if (error) {
            const errorMessage = error.details
                ? error.details.map((d) => d.message.replace(/"/g, '')).join(', ')
                : error.message || 'Validation failed';

            return res.status(400).json({
                status: false,
                message: errorMessage,
            });
        }

        const { email, password } = value;
        const normalizedEmail = email.toLowerCase().trim();

        const admin = await Admin.findOne({ email: normalizedEmail });
        if (!admin) {
            return res.status(401).json({
                status: false,
                message: 'Invalid email or password',
            });
        }

        if (!admin.is_active) {
            return res.status(403).json({
                status: false,
                message: 'This admin account is inactive. Please contact support.',
            });
        }

        // Verify password
        if (admin.password !== password) {
            return res.status(401).json({
                status: false,
                message: 'Invalid email or password',
            });
        }

        // Generate session token
        const tokenPayload = {
            id: admin._id,
            email: admin.email,
            time: Date.now(),
        };
        const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

        return res.status(200).json({
            status: true,
            message: 'Login successful',
            data: {
                token,
                admin: {
                    id: admin._id,
                    name: admin.name,
                    email: admin.email,
                },
            },
        });
    } catch (err) {
        console.error('[Admin Login Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An internal server error occurred',
        });
    }
};

export default { login };
