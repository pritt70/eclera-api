import mongoose from 'mongoose';
import Discount from './model.js';
import {
    validateCreate,
    validateUpdate,
    validateChangeStatus,
} from './helper/validation.js';

/**
 * List discounts with search, status filters, and pagination
 */
export const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 10, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim();

        const query = {};

        // Status filter
        if (status && status !== 'all') {
            if (status === 'expired') {
                query.endDate = { $lt: new Date() };
            } else if (status === 'active') {
                query.status = 'active';
            } else if (status === 'inactive') {
                query.status = 'inactive';
            } else if (status === 'special') {
                query.isSpecial = true;
            }
        }

        // Search filter (Coupon code or description)
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { code: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [discounts, total] = await Promise.all([
            Discount.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Discount.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            status: true,
            message: 'Discounts retrieved successfully',
            data: {
                discounts,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching discounts list:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve discounts',
            error: error.message,
        });
    }
};

/**
 * Get discount by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Discount ID is required',
            });
        }

        const discount = await Discount.findById(id).lean();

        if (!discount) {
            return res.status(404).json({
                status: false,
                message: 'Discount coupon not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Discount retrieved successfully',
            data: discount,
        });
    } catch (error) {
        console.error('Error retrieving discount:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve discount',
            error: error.message,
        });
    }
};

/**
 * Create a new discount coupon
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
                details: error.details,
            });
        }

        const codeUpper = value.code.toUpperCase().trim();
        const existing = await Discount.findOne({ code: codeUpper });
        if (existing) {
            return res.status(400).json({
                status: false,
                message: `Coupon code "${codeUpper}" already exists`,
            });
        }

        const newDiscount = new Discount({
            code: codeUpper,
            type: value.type || 'percentage',
            value: Number(value.value),
            minOrderValue: Number(value.minOrderValue || 0),
            maxDiscountAmount: Number(value.maxDiscountAmount || 0),
            startDate: value.startDate ? new Date(value.startDate) : null,
            endDate: value.endDate ? new Date(value.endDate) : null,
            usageLimit: Number(value.usageLimit || 0),
            perCustomerLimit: Number(value.perCustomerLimit || 1),
            status: value.status || 'active',
            isSpecial: Boolean(value.isSpecial),
            description: value.description ? value.description.trim() : '',
        });

        const saved = await newDiscount.save();

        return res.status(201).json({
            status: true,
            message: 'Discount coupon created successfully',
            data: saved,
        });
    } catch (error) {
        console.error('Error creating discount coupon:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to create discount coupon',
            error: error.message,
        });
    }
};

/**
 * Update an existing discount coupon
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Discount ID is required',
            });
        }

        const { error, value } = validateUpdate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
                details: error.details,
            });
        }

        const discount = await Discount.findById(id);
        if (!discount) {
            return res.status(404).json({
                status: false,
                message: 'Discount coupon not found',
            });
        }

        if (value.code !== undefined) {
            const codeUpper = value.code.toUpperCase().trim();
            if (codeUpper !== discount.code) {
                const dup = await Discount.findOne({ code: codeUpper, _id: { $ne: id } });
                if (dup) {
                    return res.status(400).json({
                        status: false,
                        message: `Coupon code "${codeUpper}" already exists`,
                    });
                }
                discount.code = codeUpper;
            }
        }

        if (value.type !== undefined) discount.type = value.type;
        if (value.value !== undefined) discount.value = Number(value.value);
        if (value.minOrderValue !== undefined) discount.minOrderValue = Number(value.minOrderValue);
        if (value.maxDiscountAmount !== undefined) discount.maxDiscountAmount = Number(value.maxDiscountAmount);
        if (value.startDate !== undefined) discount.startDate = value.startDate ? new Date(value.startDate) : null;
        if (value.endDate !== undefined) discount.endDate = value.endDate ? new Date(value.endDate) : null;
        if (value.usageLimit !== undefined) discount.usageLimit = Number(value.usageLimit);
        if (value.perCustomerLimit !== undefined) discount.perCustomerLimit = Number(value.perCustomerLimit);
        if (value.status !== undefined) discount.status = value.status;
        if (value.isSpecial !== undefined) discount.isSpecial = Boolean(value.isSpecial);
        if (value.description !== undefined) discount.description = value.description ? value.description.trim() : '';

        const updated = await discount.save();

        return res.status(200).json({
            status: true,
            message: 'Discount coupon updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Error updating discount coupon:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update discount coupon',
            error: error.message,
        });
    }
};

/**
 * Toggle status of a discount coupon (active / inactive)
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Discount ID is required',
            });
        }

        const { error, value } = validateChangeStatus(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
                details: error.details,
            });
        }

        const discount = await Discount.findByIdAndUpdate(
            id,
            { status: value.status },
            { new: true, runValidators: true }
        );

        if (!discount) {
            return res.status(404).json({
                status: false,
                message: 'Discount coupon not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: `Coupon status changed to ${value.status}`,
            data: discount,
        });
    } catch (error) {
        console.error('Error changing coupon status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to change coupon status',
            error: error.message,
        });
    }
};

/**
 * Delete a discount coupon
 */
export const deleteDiscount = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Discount ID is required',
            });
        }

        const discount = await Discount.findByIdAndDelete(id);

        if (!discount) {
            return res.status(404).json({
                status: false,
                message: 'Discount coupon not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Discount coupon deleted successfully',
            data: { id },
        });
    } catch (error) {
        console.error('Error deleting discount coupon:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete discount coupon',
            error: error.message,
        });
    }
};

/**
 * Public website endpoint: returns only public coupons (excludes special/hidden coupons)
 */
export const getPublicCoupons = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Discount.find({
            status: 'active',
            isSpecial: { $ne: true },
            $or: [
                { endDate: null },
                { endDate: { $gte: now } },
            ],
        })
            .select('code type value minOrderValue maxDiscountAmount description startDate endDate')
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            status: true,
            message: 'Public coupons retrieved successfully',
            data: coupons,
        });
    } catch (error) {
        console.error('Error retrieving public coupons:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve public coupons',
            error: error.message,
        });
    }
};
