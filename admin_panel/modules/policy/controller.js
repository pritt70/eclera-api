import mongoose from 'mongoose';
import Policy from './model.js';
import {
    validateCreate,
    validateUpdate,
    validateChangeStatus,
} from './helper/validation.js';

/**
 * Convert string to URL-safe slug
 */
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

/**
 * List all policies with pagination, search, status, and type filter
 */
export const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 20, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim();
        const type = (req.body?.type || req.query?.type || '').trim();

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
                { slug: { $regex: escaped, $options: 'i' } },
                { summary: { $regex: escaped, $options: 'i' } },
                { content: { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [policies, total] = await Promise.all([
            Policy.find(query)
                .sort({ sortOrder: 1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Policy.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            status: true,
            message: 'Policies retrieved successfully',
            data: {
                policies,
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
        console.error('Error fetching policies list:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve policies',
            error: error.message,
        });
    }
};

/**
 * Get policy by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const policy = await Policy.findById(id).lean();

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: 'Policy document not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy retrieved successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error fetching policy by ID:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve policy',
            error: error.message,
        });
    }
};

/**
 * Get policy by slug (Admin / Internal)
 */
export const getBySlug = async (req, res) => {
    try {
        const slug = (req.params.slug || req.body?.slug || req.query?.slug || '').trim().toLowerCase();

        if (!slug) {
            return res.status(400).json({
                status: false,
                message: 'Policy slug is required',
            });
        }

        const policy = await Policy.findOne({ slug }).lean();

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: `Policy '${slug}' not found`,
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy retrieved successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error fetching policy by slug:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve policy',
            error: error.message,
        });
    }
};

/**
 * Create a new policy
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
                details: error.details.map((d) => d.message),
            });
        }

        const slug = value.slug ? slugify(value.slug) : slugify(value.title);

        // Check for existing slug
        const existing = await Policy.findOne({ slug });
        if (existing) {
            return res.status(409).json({
                status: false,
                message: `A policy with slug "${slug}" already exists`,
            });
        }

        const newPolicy = new Policy({
            title: value.title,
            slug,
            type: value.type || 'custom',
            summary: value.summary || '',
            content: value.content,
            status: value.status || 'active',
            sortOrder: value.sortOrder || 0,
            updatedBy: req.admin?.name || 'Admin',
        });

        await newPolicy.save();

        return res.status(201).json({
            status: true,
            message: 'Policy created successfully',
            data: newPolicy,
        });
    } catch (error) {
        console.error('Error creating policy:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to create policy',
            error: error.message,
        });
    }
};

/**
 * Update policy
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.body?._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const { error, value } = validateUpdate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
                details: error.details.map((d) => d.message),
            });
        }

        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({
                status: false,
                message: 'Policy not found',
            });
        }

        if (value.slug && value.slug !== policy.slug) {
            const formattedSlug = slugify(value.slug);
            const duplicate = await Policy.findOne({ slug: formattedSlug, _id: { $ne: id } });
            if (duplicate) {
                return res.status(409).json({
                    status: false,
                    message: `A policy with slug "${formattedSlug}" already exists`,
                });
            }
            policy.slug = formattedSlug;
        }

        if (value.title !== undefined) policy.title = value.title;
        if (value.type !== undefined) policy.type = value.type;
        if (value.summary !== undefined) policy.summary = value.summary;
        if (value.content !== undefined) policy.content = value.content;
        if (value.status !== undefined) policy.status = value.status;
        if (value.sortOrder !== undefined) policy.sortOrder = value.sortOrder;
        policy.updatedBy = req.admin?.name || 'Admin';

        await policy.save();

        return res.status(200).json({
            status: true,
            message: 'Policy updated successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error updating policy:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update policy',
            error: error.message,
        });
    }
};

/**
 * Toggle active / inactive status
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.body?.id || req.query?.id;
        const status = req.body?.status || req.query?.status;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const { error } = validateChangeStatus({ status });
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
            });
        }

        const policy = await Policy.findByIdAndUpdate(
            id,
            { status, updatedBy: req.admin?.name || 'Admin' },
            { new: true }
        );

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: 'Policy not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: `Policy status changed to ${status}`,
            data: policy,
        });
    } catch (error) {
        console.error('Error toggling policy status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update policy status',
            error: error.message,
        });
    }
};

/**
 * Delete policy
 */
export const deletePolicy = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Policy ID is required',
            });
        }

        const deleted = await Policy.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                status: false,
                message: 'Policy not found or already deleted',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy deleted successfully',
            data: { id: deleted._id, title: deleted.title },
        });
    } catch (error) {
        console.error('Error deleting policy:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete policy',
            error: error.message,
        });
    }
};

/**
 * PUBLIC WEBSITE API: Get all active policies
 */
export const getPublicPolicies = async (req, res) => {
    try {
        const policies = await Policy.find({ status: 'active' })
            .select('title slug type summary content updatedAt')
            .sort({ sortOrder: 1, updatedAt: -1 })
            .lean();

        return res.status(200).json({
            status: true,
            message: 'Active policies retrieved successfully',
            data: policies,
        });
    } catch (error) {
        console.error('Error fetching public policies:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch policies',
            error: error.message,
        });
    }
};

/**
 * PUBLIC WEBSITE API: Get single policy by slug
 */
export const getPublicPolicyBySlug = async (req, res) => {
    try {
        const slug = (req.params.slug || req.query.slug || '').trim().toLowerCase();

        if (!slug) {
            return res.status(400).json({
                status: false,
                message: 'Policy slug is required',
            });
        }

        const policy = await Policy.findOne({ slug, status: 'active' })
            .select('title slug type summary content updatedAt')
            .lean();

        if (!policy) {
            return res.status(404).json({
                status: false,
                message: `Policy '${slug}' not found or currently inactive`,
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Policy retrieved successfully',
            data: policy,
        });
    } catch (error) {
        console.error('Error fetching public policy by slug:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch policy',
            error: error.message,
        });
    }
};
