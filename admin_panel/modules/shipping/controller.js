import mongoose from 'mongoose';
import Shipping from './model.js';
import {
    validateCreateShipping,
    validateUpdateShipping,
    validateChangeStatus,
} from './helper/validation.js';

/**
 * List shipping zones with search, filters, pagination and counts
 */
export const list = async (req, res) => {
    try {

        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 10, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim().toLowerCase();
        const type = (req.body?.type || req.query?.type || '').trim().toLowerCase();

        const query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (type && type !== 'all') {
            query.type = type;
        }

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { country: { $regex: escaped, $options: 'i' } },
                { state: { $regex: escaped, $options: 'i' } },
                { city: { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [rules, total, totalAll, activeCount, inactiveCount, freeCount, paidCount] = await Promise.all([
            Shipping.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Shipping.countDocuments(query),
            Shipping.countDocuments(),
            Shipping.countDocuments({ status: 'active' }),
            Shipping.countDocuments({ status: 'inactive' }),
            Shipping.countDocuments({ type: 'free' }),
            Shipping.countDocuments({ type: 'paid' }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const statusCounts = {
            all: totalAll,
            active: activeCount,
            inactive: inactiveCount,
            free: freeCount,
            paid: paidCount,
        };

        return res.status(200).json({
            status: true,
            message: 'Shipping zones retrieved successfully',
            data: {
                rules,
                statusCounts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            },
        });
    } catch (err) {
        console.error('Error fetching shipping zones:', err);
        return res.status(500).json({
            status: false,
            message: err.message || 'Internal server error while fetching shipping zones',
        });
    }
};

/**
 * Get shipping zone by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: false, message: 'Invalid shipping zone ID' });
        }

        const rule = await Shipping.findById(id).lean();
        if (!rule) {
            return res.status(404).json({ status: false, message: 'Shipping zone not found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Shipping zone retrieved',
            data: rule,
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Create a new shipping zone
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreateShipping(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
            });
        }

        const rate = Math.max(0, Number(value.rate !== undefined ? value.rate : 0));
        const type = rate === 0 ? 'free' : 'paid';

        const newRule = new Shipping({
            title: value.title,
            country: value.country || 'India',
            state: value.state || 'All States',
            city: value.city || 'All Cities',
            postalCodes: value.postalCodes || [],
            type,
            rate,
            minOrderValue: Number(value.minOrderValue || 0),
            estimatedDays: value.estimatedDays || '3-5 Business Days',
            status: value.status || 'active',
            notes: value.notes || '',
        });

        await newRule.save();

        return res.status(201).json({
            status: true,
            message: 'Shipping zone created successfully',
            data: newRule,
        });
    } catch (err) {
        console.error('Error creating shipping zone:', err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Update an existing shipping zone
 */
export const update = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id;
        const payload = { ...req.body, id };

        const { error, value } = validateUpdateShipping(payload);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
            });
        }

        const rule = await Shipping.findById(value.id);
        if (!rule) {
            return res.status(404).json({ status: false, message: 'Shipping zone not found' });
        }

        const rate = Math.max(0, Number(value.rate !== undefined ? value.rate : 0));
        const type = rate === 0 ? 'free' : 'paid';

        rule.title = value.title;
        rule.country = value.country || 'India';
        rule.state = value.state || 'All States';
        rule.city = value.city || 'All Cities';
        rule.postalCodes = value.postalCodes || [];
        rule.type = type;
        rule.rate = rate;
        rule.minOrderValue = Number(value.minOrderValue || 0);
        rule.estimatedDays = value.estimatedDays || '3-5 Business Days';
        rule.status = value.status || 'active';
        rule.notes = value.notes || '';

        await rule.save();

        return res.status(200).json({
            status: true,
            message: 'Shipping zone updated successfully',
            data: rule,
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Change status (active / inactive toggle)
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id;
        const status = req.body?.status;

        const { error } = validateChangeStatus({ id, status });
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
            });
        }

        const rule = await Shipping.findById(id);
        if (!rule) {
            return res.status(404).json({ status: false, message: 'Shipping zone not found' });
        }

        rule.status = status;
        await rule.save();

        return res.status(200).json({
            status: true,
            message: `Shipping zone marked as ${status}`,
            data: rule,
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Delete a shipping zone
 */
export const deleteShipping = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: false, message: 'Invalid shipping zone ID' });
        }

        const deleted = await Shipping.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ status: false, message: 'Shipping zone not found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Shipping zone deleted successfully',
            data: { id },
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Calculate applicable shipping fee based on country, state, city and order subtotal
 * Can be called by Website Checkout & Admin Order Create
 */
export const calculateFee = async (req, res) => {
    try {
        const country = (req.body?.country || req.query?.country || 'India').trim();
        const state = (req.body?.state || req.query?.state || '').trim();
        const city = (req.body?.city || req.query?.city || '').trim();
        const postalCode = (req.body?.postalCode || req.query?.postalCode || '').trim();
        const subtotal = Number(req.body?.subtotal || req.query?.subtotal || 0);

        // Fetch active rules matching location
        const activeRules = await Shipping.find({ status: 'active' }).lean();

        if (activeRules.length === 0) {
            return res.status(200).json({
                status: true,
                data: {
                    type: 'free',
                    rate: 0,
                    estimatedDays: '3-5 Business Days',
                    title: 'Standard Free Delivery',
                },
            });
        }

        // Find most specific match:
        // Priority 1: Specific City Match
        let matched = activeRules.find((r) =>
            city && r.city && r.city.toLowerCase() === city.toLowerCase() &&
            (r.state === 'All States' || (state && r.state.toLowerCase() === state.toLowerCase()))
        );

        // Priority 2: Specific State Match
        if (!matched && state) {
            matched = activeRules.find((r) =>
                r.state && r.state.toLowerCase() === state.toLowerCase() &&
                (r.city === 'All Cities' || !r.city)
            );
        }

        // Priority 3: Specific Country Match
        if (!matched && country) {
            matched = activeRules.find((r) =>
                r.country && r.country.toLowerCase() === country.toLowerCase() &&
                r.state === 'All States' &&
                (r.city === 'All Cities' || !r.city)
            );
        }

        // Priority 4: Fallback to first active rule
        if (!matched) {
            matched = activeRules[0];
        }

        let fee = matched.type === 'free' ? 0 : Number(matched.rate || 0);

        // Check if order subtotal qualifies for free shipping threshold
        if (matched.minOrderValue && matched.minOrderValue > 0 && subtotal >= matched.minOrderValue) {
            fee = 0;
        }

        return res.status(200).json({
            status: true,
            data: {
                ruleId: matched._id,
                title: matched.title,
                type: fee === 0 ? 'free' : 'paid',
                originalType: matched.type,
                rate: fee,
                baseRate: matched.rate,
                minOrderValue: matched.minOrderValue,
                isFreeThresholdApplied: matched.minOrderValue > 0 && subtotal >= matched.minOrderValue,
                estimatedDays: matched.estimatedDays,
            },
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};
