import mongoose from 'mongoose';
import Category from './model.js';
import { generateUniqueSlug } from './helper/slug.js';
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

const parseCategorySpecifications = (specifications) => {
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
            const specId = item.specification || item.specification_id || item._id || item.id;
            if (!specId || !mongoose.Types.ObjectId.isValid(specId)) continue;

            let optIds = [];
            const rawOptions = item.options || item.selectedOptions || [];
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
 * List categories with pagination, search, status filter, and hierarchy support
 * GET /api/admin/category or POST /api/admin/category/list
 */
export const list = async (req, res) => {
    try {
        const queryParams = { ...req.query, ...req.body };

        const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const filter = {};

        // Status filter: 'active' | 'inactive' | 'all'
        if (queryParams.status && queryParams.status !== 'all') {
            filter.status = queryParams.status;
        }

        // Parent filter: 'root' (top-level only) | 'all' | specific ObjectId
        if (queryParams.parent) {
            if (queryParams.parent === 'root' || queryParams.parent === 'null') {
                filter.parent = null;
            } else if (queryParams.parent !== 'all' && mongoose.Types.ObjectId.isValid(queryParams.parent)) {
                filter.parent = queryParams.parent;
            }
        }

        // Search filter on name and description
        if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
            const searchRegex = new RegExp(queryParams.search.trim(), 'i');
            filter.$or = [
                { name: searchRegex },
                { slug: searchRegex },
                { description: searchRegex },
            ];
        }

        // Sorting: default by sortOrder ASC, then createdAt DESC
        let sortOption = { sortOrder: 1, createdAt: -1 };
        if (queryParams.sortBy) {
            const dir = queryParams.sortDir === 'desc' || queryParams.sortOrder === 'desc' ? -1 : 1;
            sortOption = { [queryParams.sortBy]: dir };
        }

        const [total, categories] = await Promise.all([
            Category.countDocuments(filter),
            Category.find(filter)
                .populate('parent', 'name slug')
                .populate({
                    path: 'specifications.specification',
                    select: 'name display_name displayName slug status is_active is_veriant',
                })
                .populate({
                    path: 'specifications.options',
                    select: 'name sort_order',
                })
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        // Attach subcategory count and products count to each category
        const categoryIds = categories.map((c) => c._id);
        const subCounts = await Category.aggregate([
            { $match: { parent: { $in: categoryIds } } },
            { $group: { _id: '$parent', count: { $sum: 1 } } },
        ]);
        const subCountMap = new Map(subCounts.map((s) => [s._id.toString(), s.count]));

        // Aggregate products count
        let productCountMap = new Map();
        try {
            const productCounts = await mongoose.connection.collection('products').aggregate([
                {
                    $match: {
                        $or: [
                            { category: { $in: categoryIds } },
                            { category_id: { $in: categoryIds } },
                            { categories: { $in: categoryIds } },
                        ],
                    },
                },
                {
                    $project: {
                        cat: {
                            $cond: [
                                { $in: ['$category', categoryIds] },
                                '$category',
                                {
                                    $cond: [
                                        { $in: ['$category_id', categoryIds] },
                                        '$category_id',
                                        '$categories',
                                    ],
                                },
                            ],
                        },
                    },
                },
                { $unwind: { path: '$cat', preserveNullAndEmptyArrays: false } },
                { $group: { _id: '$cat', count: { $sum: 1 } } },
            ]).toArray();

            productCountMap = new Map(productCounts.map((p) => [p._id.toString(), p.count]));
        } catch {
            productCountMap = new Map();
        }

        const categoriesWithStats = categories.map((c) => {
            const imgUrl = (c.image?.url || c.image?.publicUrl || '').trim();
            const imgKey = (c.image?.key || '').trim();
            return {
                ...c,
                image: imgUrl ? { url: imgUrl, publicUrl: imgUrl, key: imgKey } : { url: '', publicUrl: '', key: '' },
                subcategoriesCount: subCountMap.get(c._id.toString()) || 0,
                productsCount: productCountMap.get(c._id.toString()) || 0,
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            status: true,
            message: 'Categories fetched successfully',
            data: {
                categories: categoriesWithStats,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasPrevPage: page > 1,
                    hasNextPage: page < totalPages,
                },
            },
        });
    } catch (err) {
        console.error('[Category List Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while fetching categories',
        });
    }
};

/**
 * Get category by ID
 * GET /api/admin/category/:id or POST /api/admin/category/view (alias: /detail)
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'A valid category ID is required',
            });
        }

        const category = await Category.findById(id)
            .populate('parent', 'name slug')
            .populate({
                path: 'specifications.specification',
                select: 'name display_name displayName slug description status is_active is_veriant',
            })
            .populate({
                path: 'specifications.options',
                select: 'name sort_order',
            })
            .lean();

        if (!category) {
            return res.status(404).json({
                status: false,
                message: 'Category not found',
            });
        }

        // Count subcategories and check products
        const subcategoriesCount = await Category.countDocuments({ parent: category._id });

        let productsCount = 0;
        try {
            productsCount = await mongoose.connection.collection('products').countDocuments({
                $or: [
                    { category: category._id },
                    { category_id: category._id },
                    { categories: category._id },
                ],
            });
        } catch {
            productsCount = 0;
        }

        const catImgUrl = (category.image?.url || category.image?.publicUrl || '').trim();
        const catImgKey = (category.image?.key || '').trim();

        return res.status(200).json({
            status: true,
            message: 'Category fetched successfully',
            data: {
                ...category,
                image: catImgUrl ? { url: catImgUrl, publicUrl: catImgUrl, key: catImgKey } : { url: '', publicUrl: '', key: '' },
                subcategoriesCount,
                productsCount,
            },
        });
    } catch (err) {
        console.error('[Category GetById Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while fetching category details',
        });
    }
};

/**
 * Create a new category
 * POST /api/admin/category
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const {
            name,
            slug: customSlug,
            description,
            image,
            parent,
            status,
            sortOrder,
            seoTitle,
            seoDescription,
        } = value;

        // Verify parent if specified
        let parentId = null;
        if (parent && parent.trim() !== '') {
            if (!mongoose.Types.ObjectId.isValid(parent)) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid parent category ID format',
                });
            }

            const parentExists = await Category.findById(parent).select('_id name');
            if (!parentExists) {
                return res.status(400).json({
                    status: false,
                    message: 'The selected parent category does not exist',
                });
            }
            parentId = parentExists._id;
        }

        // Generate unique slug
        const slugSource = customSlug && customSlug.trim() !== '' ? customSlug : name;
        const uniqueSlug = await generateUniqueSlug(slugSource);

        // Auto-assign sort order if not provided
        let assignedSortOrder = sortOrder;
        if (typeof assignedSortOrder !== 'number') {
            const count = await Category.countDocuments({ parent: parentId });
            assignedSortOrder = count;
        }

        let imageObj = { url: '', publicUrl: '', key: '' };
        if (typeof image === 'object' && image !== null) {
            const u = (image.url || image.publicUrl || '').trim();
            imageObj = {
                url: u,
                publicUrl: u,
                key: (image.key || '').trim(),
            };
        } else if (typeof image === 'string') {
            const u = image.trim();
            imageObj = { url: u, publicUrl: u, key: '' };
        }

        const { specifications } = value;
        const assignedSpecs = parseCategorySpecifications(specifications);

        const category = new Category({
            name: name.trim(),
            slug: uniqueSlug,
            description: (description || '').trim(),
            image: imageObj,
            parent: parentId,
            status: status || 'active',
            sortOrder: assignedSortOrder,
            seoTitle: (seoTitle || '').trim(),
            seoDescription: (seoDescription || '').trim(),
            specifications: assignedSpecs,
        });

        await category.save();
        await category.populate('parent', 'name slug');
        await category.populate({
            path: 'specifications.specification',
            select: 'name display_name displayName slug status is_active is_veriant',
        });
        await category.populate({
            path: 'specifications.options',
            select: 'name sort_order',
        });

        return res.status(201).json({
            status: true,
            message: 'Category created successfully',
            data: category,
        });
    } catch (err) {
        console.error('[Category Create Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while creating category',
        });
    }
};

/**
 * Update an existing category
 * PUT /api/admin/category/:id or POST /api/admin/category/update
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'A valid category ID is required',
            });
        }

        const { error, value } = validateUpdate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                status: false,
                message: 'Category not found',
            });
        }

        const {
            name,
            slug: customSlug,
            description,
            image,
            parent,
            status,
            sortOrder,
            seoTitle,
            seoDescription,
        } = value;

        // Handle parent validation
        if (parent !== undefined) {
            if (parent === null || parent === '' || parent === 'null') {
                category.parent = null;
            } else {
                if (!mongoose.Types.ObjectId.isValid(parent)) {
                    return res.status(400).json({
                        status: false,
                        message: 'Invalid parent category ID format',
                    });
                }

                if (parent.toString() === category._id.toString()) {
                    return res.status(400).json({
                        status: false,
                        message: 'A category cannot be its own parent',
                    });
                }

                // Check circular hierarchy
                let currentParentId = parent;
                while (currentParentId) {
                    if (currentParentId.toString() === category._id.toString()) {
                        return res.status(400).json({
                            status: false,
                            message: 'Circular category hierarchy is not allowed',
                        });
                    }
                    const ancestor = await Category.findById(currentParentId).select('parent');
                    currentParentId = ancestor?.parent;
                }

                const parentExists = await Category.findById(parent).select('_id');
                if (!parentExists) {
                    return res.status(400).json({
                        status: false,
                        message: 'The selected parent category does not exist',
                    });
                }
                category.parent = parentExists._id;
            }
        }

        // Handle name & slug update
        if (name && name.trim() !== '') {
            category.name = name.trim();
        }

        if (customSlug && customSlug.trim() !== '') {
            category.slug = await generateUniqueSlug(customSlug, category._id);
        } else if (name && name.trim() !== category.name) {
            category.slug = await generateUniqueSlug(category.name, category._id);
        }

        if (description !== undefined) {
            category.description = (description || '').trim();
        }

        if (image !== undefined) {
            if (typeof image === 'object' && image !== null) {
                const u = (image.url || image.publicUrl || '').trim();
                category.image = {
                    url: u,
                    publicUrl: u,
                    key: (image.key || '').trim(),
                };
            } else if (typeof image === 'string') {
                const u = image.trim();
                category.image = {
                    url: u,
                    publicUrl: u,
                    key: '',
                };
            } else {
                category.image = { url: '', publicUrl: '', key: '' };
            }
        }

        if (status !== undefined) {
            category.status = status;
        }

        if (typeof sortOrder === 'number') {
            category.sortOrder = sortOrder;
        }

        if (seoTitle !== undefined) {
            category.seoTitle = (seoTitle || '').trim();
        }

        if (seoDescription !== undefined) {
            category.seoDescription = (seoDescription || '').trim();
        }

        if (value.specifications !== undefined) {
            category.specifications = parseCategorySpecifications(value.specifications);
        }

        await category.save();
        await category.populate('parent', 'name slug');
        await category.populate({
            path: 'specifications.specification',
            select: 'name display_name displayName slug status is_active is_veriant',
        });
        await category.populate({
            path: 'specifications.options',
            select: 'name sort_order',
        });

        return res.status(200).json({
            status: true,
            message: 'Category updated successfully',
            data: category,
        });
    } catch (err) {
        console.error('[Category Update Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while updating category',
        });
    }
};

/**
 * Delete a category
 * Blocks if products use it or if it has subcategories
 * DELETE /api/admin/category/:id or POST /api/admin/category/delete
 */
export const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'A valid category ID is required',
            });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                status: false,
                message: 'Category not found',
            });
        }

        // 1. Block if products reference this category
        let productCount = 0;
        try {
            productCount = await mongoose.connection.collection('products').countDocuments({
                $or: [
                    { category: category._id },
                    { category_id: category._id },
                    { categories: category._id },
                ],
            });
        } catch {
            productCount = 0;
        }

        if (productCount > 0) {
            return res.status(400).json({
                status: false,
                message: `Cannot delete category "${category.name}" because ${productCount} product(s) are currently assigned to it. Please reassign or delete these products first.`,
            });
        }

        // 2. Block if subcategories exist under this category
        const subcategoryCount = await Category.countDocuments({ parent: category._id });
        if (subcategoryCount > 0) {
            return res.status(400).json({
                status: false,
                message: `Cannot delete category "${category.name}" because it contains ${subcategoryCount} subcategory(ies). Please reassign or delete the subcategories first.`,
            });
        }

        await Category.findByIdAndDelete(category._id);

        return res.status(200).json({
            status: true,
            message: `Category "${category.name}" deleted successfully`,
        });
    } catch (err) {
        console.error('[Category Delete Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while deleting category',
        });
    }
};

/**
 * Change category status (active <-> inactive)
 * PATCH /api/admin/category/:id/status or POST /api/admin/category/change-status
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'A valid category ID is required',
            });
        }

        const { error, value } = validateToggleStatus(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                status: false,
                message: 'Category not found',
            });
        }

        // Flip status or apply specific status if given in body
        if (value && value.status) {
            category.status = value.status;
        } else {
            category.status = category.status === 'active' ? 'inactive' : 'active';
        }

        await category.save();

        return res.status(200).json({
            status: true,
            message: `Category status changed to ${category.status}`,
            data: category,
        });
    } catch (err) {
        console.error('[Category ChangeStatus Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while changing category status',
        });
    }
};

export const toggleStatus = changeStatus;

/**
 * Bulk reorder categories
 * PUT /api/admin/category/reorder or POST /api/admin/category/reorder
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

        let operations = [];

        if (Array.isArray(value.items) && value.items.length > 0) {
            operations = value.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.id },
                    update: { $set: { sortOrder: item.sortOrder } },
                },
            }));
        } else if (Array.isArray(value.order) && value.order.length > 0) {
            operations = value.order.map((id, index) => ({
                updateOne: {
                    filter: { _id: id },
                    update: { $set: { sortOrder: index } },
                },
            }));
        }

        if (operations.length > 0) {
            await Category.bulkWrite(operations);
        }

        return res.status(200).json({
            status: true,
            message: 'Categories reordered successfully',
        });
    } catch (err) {
        console.error('[Category Reorder Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while reordering categories',
        });
    }
};

export default {
    list,
    getById,
    create,
    update,
    deleteCategory,
    changeStatus,
    toggleStatus,
    reorder,
};
