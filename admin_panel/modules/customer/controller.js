import mongoose from 'mongoose';
import Customer from './model.js';
import {
    validateCreate,
    validateUpdate,
    validateChangeStatus,
} from './helper/validation.js';

function parseAvatar(img) {
    if (!img) return { url: '', key: '' };
    if (typeof img === 'string') return { url: img.trim(), key: '' };
    if (typeof img === 'object') {
        return {
            url: String(img.url || '').trim(),
            key: String(img.key || '').trim(),
        };
    }
    return { url: '', key: '' };
}

/**
 * List customers with pagination, search, and status filtering
 */
export const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || req.body?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || req.body?.limit || 10, 10)));
        const search = (req.query.search || req.body?.search || '').trim();
        const status = (req.query.status || req.body?.status || '').trim();

        const query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phone: regex },
            ];
        }

        const skip = (page - 1) * limit;

        const [customers, total] = await Promise.all([
            Customer.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Customer.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            status: true,
            message: 'Customers retrieved successfully',
            data: {
                customers,
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
        console.error('Error fetching customers list:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve customers',
            error: error.message,
        });
    }
};

/**
 * Get customer by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Customer ID is required',
            });
        }

        const customer = await Customer.findById(id).lean();

        if (!customer) {
            return res.status(404).json({
                status: false,
                message: 'Customer not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Customer retrieved successfully',
            data: customer,
        });
    } catch (error) {
        console.error('Error retrieving customer:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve customer',
            error: error.message,
        });
    }
};

/**
 * Create a new customer
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

        const emailLower = value.email.toLowerCase().trim();
        const existing = await Customer.findOne({ email: emailLower });
        if (existing) {
            return res.status(400).json({
                status: false,
                message: `Customer with email "${emailLower}" already exists`,
            });
        }

        const avatar = parseAvatar(value.avatar);
        let tags = [];
        if (Array.isArray(value.tags)) {
            tags = value.tags.map((t) => String(t).trim()).filter(Boolean);
        } else if (typeof value.tags === 'string' && value.tags.trim()) {
            tags = value.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }

        const newCustomer = new Customer({
            firstName: value.firstName.trim(),
            lastName: value.lastName ? value.lastName.trim() : '',
            email: emailLower,
            phone: value.phone ? value.phone.trim() : '',
            avatar,
            status: value.status || 'active',
            notes: value.notes ? value.notes.trim() : '',
            tags,
            addresses: Array.isArray(value.addresses) ? value.addresses : [],
        });

        const saved = await newCustomer.save();

        return res.status(201).json({
            status: true,
            message: 'Customer created successfully',
            data: saved,
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to create customer',
            error: error.message,
        });
    }
};

/**
 * Update customer details
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Customer ID is required',
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

        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({
                status: false,
                message: 'Customer not found',
            });
        }

        if (value.email !== undefined) {
            const emailLower = value.email.toLowerCase().trim();
            if (emailLower !== customer.email) {
                const dup = await Customer.findOne({ email: emailLower, _id: { $ne: id } });
                if (dup) {
                    return res.status(400).json({
                        status: false,
                        message: `Customer with email "${emailLower}" already exists`,
                    });
                }
                customer.email = emailLower;
            }
        }

        if (value.firstName !== undefined) customer.firstName = value.firstName.trim();
        if (value.lastName !== undefined) customer.lastName = value.lastName ? value.lastName.trim() : '';
        if (value.phone !== undefined) customer.phone = value.phone ? value.phone.trim() : '';
        if (value.avatar !== undefined) customer.avatar = parseAvatar(value.avatar);
        if (value.status !== undefined) customer.status = value.status;
        if (value.notes !== undefined) customer.notes = value.notes ? value.notes.trim() : '';

        if (value.tags !== undefined) {
            if (Array.isArray(value.tags)) {
                customer.tags = value.tags.map((t) => String(t).trim()).filter(Boolean);
            } else if (typeof value.tags === 'string') {
                customer.tags = value.tags.split(',').map((t) => t.trim()).filter(Boolean);
            }
        }

        if (Array.isArray(value.addresses)) {
            customer.addresses = value.addresses;
        }

        const updated = await customer.save();

        return res.status(200).json({
            status: true,
            message: 'Customer updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Error updating customer:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update customer',
            error: error.message,
        });
    }
};

/**
 * Change customer status
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Customer ID is required',
            });
        }

        const { error, value } = validateChangeStatus(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
            });
        }

        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({
                status: false,
                message: 'Customer not found',
            });
        }

        customer.status = value.status;
        await customer.save();

        return res.status(200).json({
            status: true,
            message: `Customer status changed to ${value.status}`,
            data: { id: customer._id, status: customer.status },
        });
    } catch (error) {
        console.error('Error changing customer status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to change customer status',
            error: error.message,
        });
    }
};

/**
 * Delete customer
 */
export const deleteCustomer = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Customer ID is required',
            });
        }

        const customer = await Customer.findByIdAndDelete(id);
        if (!customer) {
            return res.status(404).json({
                status: false,
                message: 'Customer not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Customer deleted successfully',
            data: { id },
        });
    } catch (error) {
        console.error('Error deleting customer:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete customer',
            error: error.message,
        });
    }
};
