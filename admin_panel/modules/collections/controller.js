import mongoose from 'mongoose';
import Collection from './model.js';
import { generateUniqueSlug, slugify } from './helper/slug.js';
import {
    validateCreate,
    validateUpdate,
    validateToggleStatus,
    validateReorder,
} from './helper/validation.js';

const formatJoiError = (error) => {
    return error.details
        ? error.details.map((d) => d.message.replace(/"/g, '')).join(', ')
        : error.message || 'Validation failed';
};

const parseCollectionSpecifications = (specifications) => {
    if (!Array.isArray(specifications)) return [];
    const results = [];
    for (const item of specifications) {
        if (!item) continue;
        if (typeof item === 'string' && mongoose.Types.ObjectId.isValid(item)) {
            results.push({
                specification: new mongoose.Types.ObjectId(item),
                options: [],
            });
            continue;
        }
        if (typeof item === 'object') {
            const specId =
                item.specification?._id ||
                item.specification?.id ||
                item.specification ||
                item.specificationId ||
                item.specification_id ||
                item._id ||
                item.id;

            if (!specId || !mongoose.Types.ObjectId.isValid(specId)) continue;

            let optIds = [];
            const rawOptions =
                item.selectedOptionIds || item.options || item.selectedOptions || [];

            if (Array.isArray(rawOptions)) {
                optIds = rawOptions
                    .map((o) => (typeof o === 'object' && o !== null ? (o._id || o.id) : o))
                    .filter((oId) => oId && mongoose.Types.ObjectId.isValid(oId))
                    .map((oId) => new mongoose.Types.ObjectId(oId));
            }

            results.push({
                specification: new mongoose.Types.ObjectId(specId),
                options: optIds,
            });
        }
    }
    return results;
};

/**
 * List collections with search, status, category filter, and pagination
 * GET /api/admin/collection or POST /api/admin/collection/list
 */
export const list = async (req, res) => {
    try {
        const queryParams = { ...req.query, ...req.body };

        const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const filter = {};

        // Status filter: 'active' | 'inactive' | 'all'
        if (queryParams.status && queryParams.status !== 'all') {
            filter.status = queryParams.status;
        }

        // Category filter
        if (queryParams.category && mongoose.Types.ObjectId.isValid(queryParams.category)) {
            filter.$or = [
                { category: new mongoose.Types.ObjectId(queryParams.category) },
                { categories: new mongoose.Types.ObjectId(queryParams.category) },
            ];
        }

        // Search filter (name or slug)
        if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
            const searchTerm = queryParams.search.trim();
            const regex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
            filter.$or = [
                { name: { $regex: regex } },
                { slug: { $regex: regex } },
                { description: { $regex: regex } },
            ];
        }

        const total = await Collection.countDocuments(filter);
        const totalPages = Math.ceil(total / limit) || 1;

        const collections = await Collection.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('category', '_id name slug')
            .populate('categories', '_id name slug')
            .populate('specifications.specification', '_id name slug is_veriant is_variant')
            .populate('specifications.options', '_id name sort_order')
            .lean();

        const normalizedCollections = collections.map((col) => {
            const imgUrl = (col.image?.url || col.image?.publicUrl || '').trim();
            const imgKey = (col.image?.key || '').trim();
            return {
                ...col,
                image: imgUrl ? { url: imgUrl, publicUrl: imgUrl, key: imgKey } : { url: '', publicUrl: '', key: '' },
            };
        });

        return res.status(200).json({
            status: true,
            message: 'Collections fetched successfully',
            data: {
                collections: normalizedCollections,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                },
                total,
            },
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch collections',
            error: error.message,
        });
    }
};

/**
 * Get collection by ID or view
 * GET /api/admin/collection/:id or POST /api/admin/collection/view
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.query.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid collection ID format',
            });
        }

        const collection = await Collection.findById(id)
            .populate({
                path: 'category',
                select: '_id name slug image specifications',
                populate: {
                    path: 'specifications.specification',
                    select: '_id name slug display_name is_veriant is_variant',
                },
            })
            .populate({
                path: 'categories',
                select: '_id name slug image specifications',
                populate: {
                    path: 'specifications.specification',
                    select: '_id name slug display_name is_veriant is_variant',
                },
            })
            .populate('specifications.specification', '_id name slug display_name is_veriant is_variant options')
            .populate('specifications.options', '_id name sort_order')
            .lean();

        if (!collection) {
            return res.status(404).json({
                status: false,
                message: 'Collection not found',
            });
        }

        const colImgUrl = (collection.image?.url || collection.image?.publicUrl || '').trim();
        const colImgKey = (collection.image?.key || '').trim();

        return res.status(200).json({
            status: true,
            message: 'Collection details fetched successfully',
            data: {
                ...collection,
                image: colImgUrl ? { url: colImgUrl, publicUrl: colImgUrl, key: colImgKey } : { url: '', publicUrl: '', key: '' },
            },
        });
    } catch (error) {
        console.error('Error fetching collection:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch collection details',
            error: error.message,
        });
    }
};

/**
 * Create a new collection
 * POST /api/admin/collection or POST /api/admin/collection/create
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
                errors: error.details,
            });
        }

        const trimmedName = value.name.trim();

        // Check if collection with same name exists (case-insensitive)
        const nameConflict = await Collection.findOne({
            name: { $regex: new RegExp(`^${trimmedName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
        });

        if (nameConflict) {
            return res.status(400).json({
                status: false,
                message: 'A collection with this name already exists.',
            });
        }

        // Generate or validate unique slug
        const baseSlug = value.slug && value.slug.trim() ? value.slug.trim() : trimmedName;
        const slug = await generateUniqueSlug(baseSlug);

        // Normalize image
        let image = { url: '', publicUrl: '', key: '' };
        if (value.image) {
            if (typeof value.image === 'string') {
                const u = value.image.trim();
                image = { url: u, publicUrl: u, key: '' };
            } else if (typeof value.image === 'object' && value.image !== null) {
                const u = String(value.image.url || value.image.publicUrl || '').trim();
                image = {
                    url: u,
                    publicUrl: u,
                    key: value.image.key || '',
                };
            }
        }

        // Primary Category and Categories array
        let primaryCategory = null;
        let categories = [];

        if (Array.isArray(value.categories) && value.categories.length > 0) {
            categories = value.categories
                .filter((c) => c && mongoose.Types.ObjectId.isValid(c))
                .map((c) => new mongoose.Types.ObjectId(c));
            if (categories.length > 0) {
                primaryCategory = categories[0];
            }
        } else if (value.category && mongoose.Types.ObjectId.isValid(value.category)) {
            primaryCategory = new mongoose.Types.ObjectId(value.category);
            categories = [primaryCategory];
        }

        // Parse specifications
        const specifications = parseCollectionSpecifications(value.specifications);

        const newCollection = new Collection({
            name: trimmedName,
            slug,
            description: value.description || '',
            image,
            category: primaryCategory,
            categories,
            specifications,
            status: value.status || 'active',
            sortOrder: value.sortOrder || 0,
            seoTitle: value.seoTitle || '',
            seoDescription: value.seoDescription || '',
        });

        await newCollection.save();

        const populated = await Collection.findById(newCollection._id)
            .populate('category', '_id name slug')
            .populate('categories', '_id name slug')
            .populate('specifications.specification', '_id name slug is_veriant is_variant')
            .populate('specifications.options', '_id name sort_order')
            .lean();

        return res.status(201).json({
            status: true,
            message: 'Collection created successfully',
            data: populated,
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                status: false,
                message: 'A collection with this slug already exists.',
            });
        }
        return res.status(500).json({
            status: false,
            message: 'Failed to create collection',
            error: error.message,
        });
    }
};

/**
 * Update collection
 * PUT /api/admin/collection/:id or POST /api/admin/collection/update
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.body._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid collection ID format',
            });
        }

        const existing = await Collection.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: false,
                message: 'Collection not found',
            });
        }

        const { error, value } = validateUpdate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
                errors: error.details,
            });
        }

        // Name conflict check if name changed
        if (value.name && value.name.trim() !== existing.name) {
            const trimmedName = value.name.trim();
            const nameConflict = await Collection.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${trimmedName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
            });

            if (nameConflict) {
                return res.status(400).json({
                    status: false,
                    message: 'A collection with this name already exists.',
                });
            }
            existing.name = trimmedName;
        }

        // Slug conflict check if slug provided
        if (value.slug !== undefined) {
            const rawSlug = value.slug ? value.slug.trim() : slugify(existing.name);
            const slug = await generateUniqueSlug(rawSlug, id);
            existing.slug = slug;
        }

        if (value.description !== undefined) {
            existing.description = value.description || '';
        }

        if (value.image !== undefined) {
            if (typeof value.image === 'string') {
                const u = value.image.trim();
                existing.image = { url: u, publicUrl: u, key: '' };
            } else if (typeof value.image === 'object' && value.image !== null) {
                const u = String(value.image.url || value.image.publicUrl || '').trim();
                existing.image = {
                    url: u,
                    publicUrl: u,
                    key: value.image.key || '',
                };
            } else {
                existing.image = { url: '', publicUrl: '', key: '' };
            }
        }

        // Update category / categories
        if (value.category !== undefined) {
            if (value.category && mongoose.Types.ObjectId.isValid(value.category)) {
                existing.category = new mongoose.Types.ObjectId(value.category);
                existing.categories = [existing.category];
            } else {
                existing.category = null;
                existing.categories = [];
            }
        } else if (value.categories !== undefined && Array.isArray(value.categories)) {
            existing.categories = value.categories
                .filter((c) => c && mongoose.Types.ObjectId.isValid(c))
                .map((c) => new mongoose.Types.ObjectId(c));
            existing.category = existing.categories.length > 0 ? existing.categories[0] : null;
        }

        // Update specifications
        if (value.specifications !== undefined) {
            existing.specifications = parseCollectionSpecifications(value.specifications);
        }

        if (value.status !== undefined) {
            existing.status = value.status;
        }

        if (value.sortOrder !== undefined) {
            existing.sortOrder = value.sortOrder;
        }

        if (value.seoTitle !== undefined) {
            existing.seoTitle = value.seoTitle || '';
        }

        if (value.seoDescription !== undefined) {
            existing.seoDescription = value.seoDescription || '';
        }

        await existing.save();

        const updated = await Collection.findById(id)
            .populate('category', '_id name slug')
            .populate('categories', '_id name slug')
            .populate('specifications.specification', '_id name slug is_veriant is_variant')
            .populate('specifications.options', '_id name sort_order')
            .lean();

        return res.status(200).json({
            status: true,
            message: 'Collection updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Error updating collection:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                status: false,
                message: 'A collection with this slug already exists.',
            });
        }
        return res.status(500).json({
            status: false,
            message: 'Failed to update collection',
            error: error.message,
        });
    }
};

/**
 * Toggle or change status
 * PATCH /api/admin/collection/:id/status or POST /api/admin/collection/change-status
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.body._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid collection ID format',
            });
        }

        const collection = await Collection.findById(id);
        if (!collection) {
            return res.status(404).json({
                status: false,
                message: 'Collection not found',
            });
        }

        if (req.body.status && ['active', 'inactive'].includes(req.body.status)) {
            collection.status = req.body.status;
        } else {
            // Toggle
            collection.status = collection.status === 'active' ? 'inactive' : 'active';
        }

        await collection.save();

        return res.status(200).json({
            status: true,
            message: `Collection status changed to ${collection.status}`,
            data: {
                _id: collection._id,
                status: collection.status,
            },
        });
    } catch (error) {
        console.error('Error changing collection status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update collection status',
            error: error.message,
        });
    }
};

export const toggleStatus = changeStatus;

/**
 * Delete collection
 * DELETE /api/admin/collection/:id or POST /api/admin/collection/delete
 */
export const deleteCollection = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.body._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid collection ID format',
            });
        }

        const collection = await Collection.findById(id);
        if (!collection) {
            return res.status(404).json({
                status: false,
                message: 'Collection not found',
            });
        }

        await Collection.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Collection deleted successfully',
            data: { id },
        });
    } catch (error) {
        console.error('Error deleting collection:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete collection',
            error: error.message,
        });
    }
};

/**
 * Reorder collections
 * PUT /api/admin/collection/reorder or POST /api/admin/collection/reorder
 */
export const reorder = async (req, res) => {
    try {
        const { error, value } = validateReorder(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const bulkOps = [];

        if (Array.isArray(value.items)) {
            for (const item of value.items) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: new mongoose.Types.ObjectId(item.id) },
                        update: { $set: { sortOrder: item.sortOrder } },
                    },
                });
            }
        } else if (Array.isArray(value.order)) {
            value.order.forEach((id, index) => {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: new mongoose.Types.ObjectId(id) },
                        update: { $set: { sortOrder: index } },
                    },
                });
            });
        }

        if (bulkOps.length > 0) {
            await Collection.bulkWrite(bulkOps);
        }

        return res.status(200).json({
            status: true,
            message: 'Collections reordered successfully',
        });
    } catch (error) {
        console.error('Error reordering collections:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to reorder collections',
            error: error.message,
        });
    }
};
