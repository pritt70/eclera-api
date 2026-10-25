import crypto from 'crypto';
import Customer from '../../../admin_panel/modules/customer/model.js';

// Helper to hash passwords
function hashPassword(pwd) {
    if (!pwd) return '';
    return crypto.createHash('sha256').update(String(pwd)).digest('hex');
}

// Helper to parse token from Authorization header or req body
function extractCustomerId(req) {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const rawToken = authHeader.split(' ')[1];
            const decoded = JSON.parse(Buffer.from(rawToken, 'base64').toString('utf-8'));
            if (decoded && decoded.id) return decoded.id;
        }
        if (req.body?.customerId || req.body?.id || req.body?._id) {
            return req.body.customerId || req.body.id || req.body._id;
        }
        if (req.query?.customerId || req.query?.id) {
            return req.query.customerId || req.query.id;
        }
    } catch (e) {
        // Token parse error
    }
    return null;
}

// Helper to sanitize customer output (exclude raw password hash)
function sanitizeCustomer(customer) {
    if (!customer) return null;
    const obj = customer.toObject ? customer.toObject() : { ...customer };
    delete obj.password;
    return obj;
}

/**
 * 1. Single Unified Customer Authentication (Login & Signup)
 * Accepts either:
 * - { authType: 'email', email, password, name? }
 * - { authType: 'phone', phone, password?, name? }
 */
export const customerAuth = async (req, res) => {
    try {
        const { authType = 'phone', mode = '', email, phone, password, name } = req.body || {};

        if (authType === 'email' || (email && !phone)) {
            // === EMAIL AUTH ===
            if (!email || !email.trim()) {
                return res.status(400).json({ status: false, message: 'Email address is required.' });
            }
            const normalizedEmail = email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(normalizedEmail)) {
                return res.status(400).json({ status: false, message: 'Please enter a valid email address.' });
            }

            if (!password || String(password).trim().length < 4) {
                return res.status(400).json({ status: false, message: 'Password must be at least 4 characters.' });
            }

            let customer = await Customer.findOne({ email: normalizedEmail });

            if (mode === 'signup' && customer) {
                return res.status(400).json({ status: false, message: 'An account with this email address already exists. Please log in.' });
            }

            if (mode === 'login' && !customer) {
                return res.status(404).json({ status: false, message: 'No account found with this email address. Please sign up.' });
            }

            if (customer) {
                if (customer.status === 'blocked') {
                    return res.status(403).json({ status: false, message: 'Your account has been blocked. Please contact support.' });
                }
                const hashedPassword = hashPassword(password);
                if (customer.password && customer.password !== hashedPassword) {
                    return res.status(401).json({ status: false, message: 'Incorrect password. Please try again.' });
                }
                if (!customer.password) {
                    customer.password = hashedPassword;
                    await customer.save();
                }
            } else {
                const derivedName = (name && name.trim()) || normalizedEmail.split('@')[0];
                customer = await Customer.create({
                    email: normalizedEmail,
                    password: hashPassword(password),
                    fullName: derivedName,
                    firstName: derivedName.split(' ')[0],
                    status: 'active',
                });
            }

            const token = Buffer.from(
                JSON.stringify({ id: customer._id, email: customer.email, phone: customer.phone, time: Date.now() })
            ).toString('base64');

            return res.status(200).json({
                status: true,
                message: mode === 'signup' ? 'Account created successfully!' : 'Login successful!',
                data: {
                    token,
                    customer: sanitizeCustomer(customer),
                },
            });
        } else {
            // === MOBILE NUMBER AUTH ===
            if (!phone) {
                return res.status(400).json({ status: false, message: 'Mobile number is required.' });
            }
            const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
            if (cleanPhone.length !== 10) {
                return res.status(400).json({ status: false, message: 'Please enter a valid 10-digit mobile number.' });
            }

            if (!password || String(password).trim().length < 4) {
                return res.status(400).json({ status: false, message: 'Password must be at least 4 characters.' });
            }

            let customer = await Customer.findOne({
                phone: { $regex: new RegExp(cleanPhone + '$') }
            });

            if (mode === 'signup') {
                if (customer) {
                    return res.status(400).json({ status: false, message: 'An account with this mobile number already exists. Please log in.' });
                }
                if (!name || !name.trim()) {
                    return res.status(400).json({ status: false, message: 'Full name is required for registration.' });
                }
                const derivedName = name.trim();
                customer = await Customer.create({
                    phone: cleanPhone,
                    password: hashPassword(password),
                    fullName: derivedName,
                    firstName: derivedName.split(' ')[0],
                    email: (email && email.trim().toLowerCase()) || '',
                    status: 'active',
                });
            } else if (mode === 'login') {
                if (!customer) {
                    return res.status(404).json({ status: false, message: 'No account found with this mobile number. Please sign up.' });
                }
                if (customer.status === 'blocked') {
                    return res.status(403).json({ status: false, message: 'Your account has been blocked. Please contact support.' });
                }
                const hashedPassword = hashPassword(password);
                if (customer.password && customer.password !== hashedPassword) {
                    return res.status(401).json({ status: false, message: 'Incorrect password. Please try again.' });
                }
                if (!customer.password) {
                    customer.password = hashedPassword;
                    await customer.save();
                }
            } else {
                // Unified fallback
                if (customer) {
                    if (customer.status === 'blocked') {
                        return res.status(403).json({ status: false, message: 'Your account has been blocked. Please contact support.' });
                    }
                    const hashedPassword = hashPassword(password);
                    if (customer.password && customer.password !== hashedPassword) {
                        return res.status(401).json({ status: false, message: 'Incorrect password. Please try again.' });
                    }
                } else {
                    const derivedName = (name && name.trim()) || `Customer ${cleanPhone.slice(-4)}`;
                    customer = await Customer.create({
                        phone: cleanPhone,
                        password: hashPassword(password),
                        fullName: derivedName,
                        firstName: derivedName.split(' ')[0],
                        email: (email && email.trim().toLowerCase()) || '',
                        status: 'active',
                    });
                }
            }

            const token = Buffer.from(
                JSON.stringify({ id: customer._id, email: customer.email, phone: customer.phone, time: Date.now() })
            ).toString('base64');

            return res.status(200).json({
                status: true,
                message: mode === 'signup' ? 'Account created successfully!' : 'Login successful!',
                data: {
                    token,
                    customer: sanitizeCustomer(customer),
                },
            });
        }
    } catch (err) {
        console.error('Customer Auth Error:', err);
        return res.status(500).json({ status: false, message: err.message || 'Authentication failed.' });
    }
};

/**
 * 2. Get Current Customer Profile
 */
export const getProfile = async (req, res) => {
    try {
        const customerId = extractCustomerId(req);
        if (!customerId) {
            return res.status(401).json({ status: false, message: 'Authentication required.' });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ status: false, message: 'Customer account not found.' });
        }

        return res.status(200).json({
            status: true,
            data: sanitizeCustomer(customer),
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message || 'Failed to fetch profile.' });
    }
};

/**
 * 3. Update Customer Profile
 * Business Rules:
 * - Credentials (email/phone) cannot be modified once set.
 * - If email is already present -> disabled / cannot change.
 * - If email is not present -> user can add it once; after saving, it is locked permanently.
 * - If phone is already present -> disabled / cannot change.
 * - If phone is not present -> phone is REQUIRED when editing profile; after saving, it is locked permanently.
 * - Editable fields: fullName, country, city, state, postalCode, deliveryAddress.
 */
export const updateProfile = async (req, res) => {
    try {
        const customerId = extractCustomerId(req);
        if (!customerId) {
            return res.status(401).json({ status: false, message: 'Authentication required.' });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ status: false, message: 'Customer account not found.' });
        }

        const body = req.body || {};

        // 1. Mobile number validation and lock rule
        if (customer.phone && customer.phone.trim().length > 0) {
            // Already set: LOCKED, do not change even if body sends another phone
        } else {
            // Not set: REQUIRED when editing profile!
            const rawPhone = body.phone || '';
            const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '').slice(-10);
            if (!cleanPhone || cleanPhone.length !== 10) {
                return res.status(400).json({
                    status: false,
                    message: 'Mobile number is required (10 digits) to update your profile.',
                });
            }

            // Check if phone is already used by another customer
            const existingPhone = await Customer.findOne({ phone: cleanPhone, _id: { $ne: customer._id } });
            if (existingPhone) {
                return res.status(400).json({
                    status: false,
                    message: 'This mobile number is already registered with another account.',
                });
            }

            customer.phone = cleanPhone;
        }

        // 2. Email validation and lock rule
        if (customer.email && customer.email.trim().length > 0) {
            // Already set: LOCKED, do not change even if body sends another email
        } else if (body.email && body.email.trim().length > 0) {
            // Not set: can add once
            const normalizedEmail = body.email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(normalizedEmail)) {
                return res.status(400).json({
                    status: false,
                    message: 'Please provide a valid email address.',
                });
            }

            // Check if email is already used by another customer
            const existingEmail = await Customer.findOne({ email: normalizedEmail, _id: { $ne: customer._id } });
            if (existingEmail) {
                return res.status(400).json({
                    status: false,
                    message: 'This email is already registered with another account.',
                });
            }

            customer.email = normalizedEmail;
        }

        // 3. Other Profile Details
        if (body.fullName !== undefined) {
            const trimmedName = String(body.fullName).trim();
            customer.fullName = trimmedName;
            const nameParts = trimmedName.split(' ');
            customer.firstName = nameParts[0] || 'Customer';
            customer.lastName = nameParts.slice(1).join(' ') || '';
        }

        if (body.country !== undefined) {
            customer.country = String(body.country).trim() || 'India';
        }

        if (body.state !== undefined) {
            customer.state = String(body.state).trim();
        }

        if (body.city !== undefined) {
            customer.city = String(body.city).trim();
        }

        if (body.postalCode !== undefined) {
            customer.postalCode = String(body.postalCode).trim();
        }

        if (body.deliveryAddress !== undefined) {
            customer.deliveryAddress = String(body.deliveryAddress).trim();
        }

        // Also sync default address inside customer.addresses array for checkout compatibility
        if (customer.deliveryAddress) {
            const primaryAddr = {
                name: customer.fullName || customer.firstName || 'Customer',
                phone: customer.phone || '',
                street: customer.deliveryAddress,
                city: customer.city || '',
                state: customer.state || '',
                postalCode: customer.postalCode || '',
                country: customer.country || 'India',
                isDefault: true,
            };
            if (!customer.addresses || customer.addresses.length === 0) {
                customer.addresses = [primaryAddr];
            } else {
                customer.addresses[0] = { ...customer.addresses[0], ...primaryAddr };
            }
        }

        await customer.save();

        return res.status(200).json({
            status: true,
            message: 'Profile updated successfully.',
            data: sanitizeCustomer(customer),
        });
    } catch (err) {
        console.error('Update Profile Error:', err);
        return res.status(500).json({ status: false, message: err.message || 'Failed to update profile.' });
    }
};
