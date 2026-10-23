import mongoose from 'mongoose';
import { Specification, SpecificationOption } from './model.js';
import { generateUniqueSlug } from './helper/slug.js';
import {
    validateCreate,
    validateUpdate,
    validateOption,
    validateToggleStatus,
    validateReorder,
} from './helper/validation.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatJoiError = (error) => {
    return error.details
        ? error.details.map((d) => d.message.replace(/"/g, '')).join(', ')
        : error.message || 'Validation failed';
};

/**
 * Helper to check whether an option is in use across categories, collections, or products
 */
export const checkOptionUsage = async (optionId, specId) => {
    try {
        if (!optionId || !mongoose.Types.ObjectId.isValid(optionId)) return false;
        const optObjectId = new mongoose.Types.ObjectId(optionId);

        // 1. Check Categories
        try {
            const cat = await mongoose.connection.collection('categories').findOne({
                $or: [
                    { 'specifications.options': optObjectId },
                    { 'specifications.selectedOptions': optObjectId },
                    { options: optObjectId },
                    { selectedOptions: optObjectId },
                    { optionIds: optObjectId },
                ],
            });
            if (cat) return true;
        } catch { }

        // 2. Check Collections
        try {
            const col = await mongoose.connection.collection('collections').findOne({
                $or: [
                    { 'specifications.options': optObjectId },
                    { 'specifications.selectedOptions': optObjectId },
                    { options: optObjectId },
                    { selectedOptions: optObjectId },
                    { optionIds: optObjectId },
                ],
            });
            if (col) return true;
        } catch { }

        // 3. Check Products
        try {
            const prod = await mongoose.connection.collection('products').findOne({
                $or: [
                    { 'specifications.options': optObjectId },
                    { 'specifications.selectedOptions': optObjectId },
                    { 'specification_options': optObjectId },
                    { options: optObjectId },
                    { selectedOptions: optObjectId },
                    { optionIds: optObjectId },
                ],
            });
            if (prod) return true;
        } catch { }

        return false;
    } catch {
        return false;
    }
};

/**
 * Helper to check whether a specification is in use across categories, collections, or products
 */
export const checkSpecUsage = async (specId) => {
    try {
        if (!specId || !mongoose.Types.ObjectId.isValid(specId)) return false;
        const specObjectId = new mongoose.Types.ObjectId(specId);

        // 1. Check Categories
        try {
            const cat = await mongoose.connection.collection('categories').findOne({
                $or: [
                    { specifications: specObjectId },
                    { 'specifications.specification': specObjectId },
                    { 'specifications._id': specObjectId },
                    { specificationIds: specObjectId },
                ],
            });
            if (cat) return true;
        } catch { }

        // 2. Check Collections
        try {
            const col = await mongoose.connection.collection('collections').findOne({
                $or: [
                    { specifications: specObjectId },
                    { 'specifications.specification': specObjectId },
                    { 'specifications._id': specObjectId },
                    { specificationIds: specObjectId },
                ],
            });
            if (col) return true;
        } catch { }

        // 3. Check Products
        try {
            const prod = await mongoose.connection.collection('products').findOne({
                $or: [
                    { specifications: specObjectId },
                    { 'specifications.specification': specObjectId },
                    { 'specifications._id': specObjectId },
                    { specificationIds: specObjectId },
                ],
            });
            if (prod) return true;
        } catch { }

        return false;
    } catch {
        return false;
    }
};

/**
 * List specifications with pagination, search, and status filter
 * GET /api/admin/specification or POST /api/admin/specification/list
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
            filter.is_active = queryParams.status === 'active';
        }

        // Search filter across name, display_name, slug, and description
        if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
            const searchRegex = new RegExp(escapeRegex(queryParams.search.trim()), 'i');
            filter.$or = [
                { name: searchRegex },
                { display_name: searchRegex },
                { displayName: searchRegex },
                { slug: searchRegex },
                { description: searchRegex },
            ];
        }

        let sortOption = { sort_order: 1, created_at: -1, createdAt: -1 };
        if (queryParams.sortBy) {
            const dir = queryParams.sortDir === 'desc' || queryParams.sortOrder === 'desc' ? -1 : 1;
            sortOption = { [queryParams.sortBy]: dir };
        }

        const [total, specifications] = await Promise.all([
            Specification.countDocuments(filter),
            Specification.find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        // Fetch options for all specifications in current page from specification_options
        const specIds = specifications.map((s) => s._id);
        const allOptions = await SpecificationOption.find({ specification_id: { $in: specIds } })
            .sort({ sort_order: 1, created_at: 1 })
            .lean();

        const optionsBySpecId = new Map();
        for (const opt of allOptions) {
            const k = opt.specification_id ? opt.specification_id.toString() : '';
            if (!k) continue;
            if (!optionsBySpecId.has(k)) optionsBySpecId.set(k, []);
            optionsBySpecId.get(k).push({
                _id: opt._id,
                id: opt._id,
                name: opt.name,
                sort_order: opt.sort_order,
            });
        }

        // Count category usage for each specification
        let catCountMap = new Map();
        try {
            const catCounts = await mongoose.connection.collection('categories').aggregate([
                { $unwind: { path: '$specifications', preserveNullAndEmptyArrays: false } },
                {
                    $project: {
                        specId: {
                            $cond: [
                                { $eq: [{ $type: '$specifications' }, 'objectId'] },
                                '$specifications',
                                '$specifications.specification'
                            ]
                        }
                    }
                },
                { $match: { specId: { $in: specIds } } },
                { $group: { _id: '$specId', count: { $sum: 1 } } },
            ]).toArray();
            catCountMap = new Map(catCounts.map((c) => [c._id ? c._id.toString() : '', c.count]));
        } catch {}

        const specificationsWithStats = specifications.map((s) => {
            const specIdStr = s._id.toString();
            const fromDbOptions = optionsBySpecId.get(specIdStr);
            const embeddedOptions = Array.isArray(s.options) ? s.options : [];
            const finalOptions = fromDbOptions && fromDbOptions.length > 0 ? fromDbOptions : embeddedOptions;
            const categoriesCount = catCountMap.get(specIdStr) || 0;

            return {
                ...s,
                id: s._id,
                display_name: s.display_name || s.displayName || s.name,
                displayName: s.display_name || s.displayName || s.name,
                status: s.is_active ? 'active' : 'inactive',
                is_veriant: Boolean(s.is_veriant ?? s.is_variant ?? false),
                is_variant: Boolean(s.is_veriant ?? s.is_variant ?? false),
                options: finalOptions,
                optionsCount: finalOptions.length,
                categoriesCount,
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            status: true,
            message: 'Specifications fetched successfully',
            data: {
                specifications: specificationsWithStats,
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
        console.error('[Specification List Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while fetching specifications',
        });
    }
};

/**
 * Get single specification by ID (View/Detail API)
 * Enriches options with `is_used` boolean flag
 * GET /api/admin/specification/:id or POST /api/admin/specification/view (alias: /detail)
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.query.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid specification ID format',
            });
        }

        const specification = await Specification.findById(id).lean();

        if (!specification) {
            return res.status(404).json({
                status: false,
                message: 'Specification not found',
            });
        }

        // Fetch options from specification_options collection
        const optionsList = await SpecificationOption.find({
            specification_id: specification._id,
        })
            .sort({ sort_order: 1, created_at: 1 })
            .lean();

        // Check usage for each option
        const optionsWithUsage = await Promise.all(
            optionsList.map(async (opt) => {
                const is_used = await checkOptionUsage(opt._id, specification._id);
                return {
                    ...opt,
                    id: opt._id,
                    is_used,
                    isUsed: is_used,
                };
            })
        );

        const is_used = await checkSpecUsage(specification._id);

        return res.status(200).json({
            status: true,
            message: 'Specification retrieved successfully',
            data: {
                ...specification,
                id: specification._id,
                display_name: specification.display_name || specification.displayName || specification.name,
                displayName: specification.display_name || specification.displayName || specification.name,
                status: specification.is_active ? 'active' : 'inactive',
                is_veriant: Boolean(specification.is_veriant ?? specification.is_variant ?? false),
                is_variant: Boolean(specification.is_veriant ?? specification.is_variant ?? false),
                options: optionsWithUsage,
                optionsCount: optionsWithUsage.length,
                is_used,
                isUsed: is_used,
            },
        });
    } catch (err) {
        console.error('[Specification GetById Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while retrieving specification',
        });
    }
};

/**
 * Create a new specification
 * Options are created after the specification exists, so create step contains no options
 * (Or if provided in admin form, saved cleanly into specification_options).
 * POST /api/admin/specification/create
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

        const trimmedName = value.name.trim();

        // Unique Name check (ignoring upper/lower case and extra spaces)
        const nameRegex = new RegExp(`^\\s*${escapeRegex(trimmedName)}\\s*$`, 'i');
        const existingName = await Specification.findOne({ name: nameRegex });
        if (existingName) {
            return res.status(400).json({
                status: false,
                message: 'A specification with this name already exists.',
            });
        }

        // Display Name defaults to name if empty
        const displayName =
            value.display_name && value.display_name.trim()
                ? value.display_name.trim()
                : value.displayName && value.displayName.trim()
                    ? value.displayName.trim()
                    : trimmedName;

        // Slug generation
        let slug = value.slug ? value.slug.trim() : '';
        if (!slug) {
            slug = await generateUniqueSlug(trimmedName);
        } else {
            slug = await generateUniqueSlug(slug);
        }

        const isActive = value.status ? value.status === 'active' : value.is_active !== false;
        const isVeriant = Boolean(
            value.is_veriant !== undefined
                ? value.is_veriant
                : value.is_variant !== undefined
                    ? value.is_variant
                    : value.isVariant
        );

        const specification = new Specification({
            name: trimmedName,
            display_name: displayName,
            displayName,
            slug,
            description: value.description ? value.description.trim() : null,
            is_active: isActive,
            is_veriant: isVeriant,
            is_variant: isVeriant,
            status: isActive ? 'active' : 'inactive',
            sort_order: value.sort_order || value.sortOrder || 0,
        });

        await specification.save();

        // Save options into specification_options collection if passed from frontend
        if (Array.isArray(value.options) && value.options.length > 0) {
            const optionDocs = [];
            const seenNames = new Set();
            let sortIdx = 0;

            for (const item of value.options) {
                const optName = typeof item === 'string' ? item.trim() : (item.name || '').trim();
                if (!optName) continue;
                const lower = optName.toLowerCase();
                if (seenNames.has(lower)) continue;
                seenNames.add(lower);

                optionDocs.push({
                    specification_id: specification._id,
                    name: optName,
                    sort_order: sortIdx++,
                });
            }

            if (optionDocs.length > 0) {
                await SpecificationOption.insertMany(optionDocs);
            }
        }

        return res.status(201).json({
            status: true,
            message: 'Specification created successfully',
            data: specification,
        });
    } catch (err) {
        console.error('[Specification Create Error]:', err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || 'field';
            return res.status(400).json({
                status: false,
                message: `A specification with this ${field} already exists`,
            });
        }
        return res.status(500).json({
            status: false,
            message: 'An error occurred while creating specification',
        });
    }
};

/**
 * Update specification fields & options
 * Guard: if an option is used anywhere, it CANNOT be removed! (only renamed)
 * PUT /api/admin/specification/:id or POST /api/admin/specification/update/:id
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid specification ID format',
            });
        }

        const { error, value } = validateUpdate(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const specification = await Specification.findById(id);
        if (!specification) {
            return res.status(404).json({
                status: false,
                message: 'Specification not found',
            });
        }

        // Check unique Name if changed
        if (value.name && value.name.trim() !== specification.name) {
            const trimmedName = value.name.trim();
            const nameRegex = new RegExp(`^\\s*${escapeRegex(trimmedName)}\\s*$`, 'i');
            const existingName = await Specification.findOne({
                _id: { $ne: id },
                name: nameRegex,
            });
            if (existingName) {
                return res.status(400).json({
                    status: false,
                    message: 'A specification with this name already exists.',
                });
            }
            specification.name = trimmedName;
        }

        if (value.display_name !== undefined || value.displayName !== undefined) {
            const val = value.display_name || value.displayName;
            specification.display_name = val && val.trim() ? val.trim() : specification.name;
            specification.displayName = specification.display_name;
        }

        if (value.slug && value.slug.trim() !== specification.slug) {
            specification.slug = await generateUniqueSlug(value.slug.trim(), id);
        }

        if (value.description !== undefined) {
            specification.description = value.description && value.description.trim() ? value.description.trim() : null;
        }

        if (value.status !== undefined || value.is_active !== undefined) {
            const isActive = value.status ? value.status === 'active' : Boolean(value.is_active);
            specification.is_active = isActive;
            specification.status = isActive ? 'active' : 'inactive';
        }

        if (value.is_veriant !== undefined || value.is_variant !== undefined || value.isVariant !== undefined) {
            const isVeriant = Boolean(
                value.is_veriant !== undefined
                    ? value.is_veriant
                    : value.is_variant !== undefined
                        ? value.is_variant
                        : value.isVariant
            );
            specification.is_veriant = isVeriant;
            specification.is_variant = isVeriant;
        }

        if (value.sort_order !== undefined || value.sortOrder !== undefined) {
            specification.sort_order = value.sort_order ?? value.sortOrder;
        }

        await specification.save();

        // Handle options update if provided in payload
        if (Array.isArray(value.options)) {
            const existingOptions = await SpecificationOption.find({ specification_id: id });
            const incomingOptions = value.options;

            // Check duplicate names in incoming payload
            const seenOptionNames = new Set();
            for (const opt of incomingOptions) {
                const optName = typeof opt === 'string' ? opt.trim() : (opt.name || '').trim();
                if (!optName) continue;
                const lower = optName.toLowerCase();
                if (seenOptionNames.has(lower)) {
                    return res.status(400).json({
                        status: false,
                        message: `Duplicate option name "${optName}" inside specification`,
                    });
                }
                seenOptionNames.add(lower);
            }

            // Guard: check if any removed option was used!
            const incomingIds = new Set(
                incomingOptions
                    .map((o) => (typeof o === 'object' && o._id ? o._id.toString() : null))
                    .filter(Boolean)
            );

            for (const existingOpt of existingOptions) {
                const existingIdStr = existingOpt._id.toString();
                if (!incomingIds.has(existingIdStr)) {
                    const is_used = await checkOptionUsage(existingOpt._id, id);
                    if (is_used) {
                        return res.status(400).json({
                            status: false,
                            message: `Cannot remove option "${existingOpt.name}" because it is currently in use in categories, collections, or products.`,
                        });
                    }
                    await SpecificationOption.findByIdAndDelete(existingOpt._id);
                }
            }

            // Update existing & insert new
            let sortIdx = 0;
            for (const opt of incomingOptions) {
                const optName = typeof opt === 'string' ? opt.trim() : (opt.name || '').trim();
                if (!optName) continue;

                if (typeof opt === 'object' && opt._id && mongoose.Types.ObjectId.isValid(opt._id)) {
                    await SpecificationOption.findByIdAndUpdate(opt._id, {
                        name: optName,
                        sort_order: sortIdx++,
                    });
                } else {
                    await SpecificationOption.create({
                        specification_id: id,
                        name: optName,
                        sort_order: sortIdx++,
                    });
                }
            }
        }

        return res.status(200).json({
            status: true,
            message: 'Specification updated successfully',
            data: specification,
        });
    } catch (err) {
        console.error('[Specification Update Error]:', err);
        if (err.code === 11000) {
            return res.status(400).json({
                status: false,
                message: 'Duplicate key error: name or slug already in use',
            });
        }
        return res.status(500).json({
            status: false,
            message: 'An error occurred while updating specification',
        });
    }
};

/**
 * Delete a specification (cascade delete options)
 * Blocked while a category or collection uses it. Deactivate it instead.
 * DELETE /api/admin/specification/:id or POST /api/admin/specification/delete/:id
 */
export const deleteSpecification = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid specification ID format',
            });
        }

        const specification = await Specification.findById(id);
        if (!specification) {
            return res.status(404).json({
                status: false,
                message: 'Specification not found',
            });
        }

        // Guard: check if specification is used
        const is_used = await checkSpecUsage(id);
        if (is_used) {
            return res.status(400).json({
                status: false,
                message: 'Cannot delete specification because it is assigned to categories, collections, or products. Deactivate it instead.',
            });
        }

        // Cascade delete options
        await SpecificationOption.deleteMany({ specification_id: id });
        await Specification.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Specification deleted successfully',
        });
    } catch (err) {
        console.error('[Specification Delete Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while deleting specification',
        });
    }
};

/**
 * Change specification active/inactive status
 * PATCH /api/admin/specification/:id/change-status or POST /api/admin/specification/change-status
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid specification ID format',
            });
        }

        const specification = await Specification.findById(id);
        if (!specification) {
            return res.status(404).json({
                status: false,
                message: 'Specification not found',
            });
        }

        const nextActive = req.body.is_active !== undefined
            ? Boolean(req.body.is_active)
            : req.body.status
                ? req.body.status === 'active'
                : !specification.is_active;

        specification.is_active = nextActive;
        specification.status = nextActive ? 'active' : 'inactive';
        await specification.save();

        return res.status(200).json({
            status: true,
            message: `Specification marked as ${specification.status}`,
            data: {
                id: specification._id,
                is_active: specification.is_active,
                status: specification.status,
            },
        });
    } catch (err) {
        console.error('[Specification ChangeStatus Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while updating status',
        });
    }
};

export const toggleStatus = changeStatus;

/**
 * Reorder specifications
 * POST /api/admin/specification/reorder
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

        let updates = [];
        if (value.items) {
            updates = value.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.id },
                    update: { $set: { sort_order: item.sortOrder } },
                },
            }));
        } else if (value.order) {
            updates = value.order.map((id, index) => ({
                updateOne: {
                    filter: { _id: id },
                    update: { $set: { sort_order: index } },
                },
            }));
        }

        if (updates.length > 0) {
            await Specification.bulkWrite(updates);
        }

        return res.status(200).json({
            status: true,
            message: 'Specifications reordered successfully',
        });
    } catch (err) {
        console.error('[Specification Reorder Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while reordering specifications',
        });
    }
};

// ==========================================
// OPTIONS MANAGEMENT (specification_options)
// ==========================================

/**
 * Add an option to a specification
 * POST /api/admin/specification/:id/options or POST /api/admin/specification/option/add
 */
export const addOption = async (req, res) => {
    try {
        const id = req.params.id || req.body.specificationId || req.body.specification_id || req.body.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid specification ID format',
            });
        }

        const { error, value } = validateOption(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const specification = await Specification.findById(id);
        if (!specification) {
            return res.status(404).json({
                status: false,
                message: 'Specification not found',
            });
        }

        const optionName = value.name.trim();

        // Option name: Required, unique inside its specification ignoring case and extra spaces
        const duplicate = await SpecificationOption.findOne({
            specification_id: id,
            name: new RegExp(`^\\s*${escapeRegex(optionName)}\\s*$`, 'i'),
        });

        if (duplicate) {
            return res.status(400).json({
                status: false,
                message: `Option "${optionName}" already exists in this specification`,
            });
        }

        const count = await SpecificationOption.countDocuments({ specification_id: id });
        const newOption = await SpecificationOption.create({
            specification_id: id,
            name: optionName,
            sort_order: count,
        });

        return res.status(201).json({
            status: true,
            message: 'Option added successfully',
            data: newOption,
        });
    } catch (err) {
        console.error('[Specification AddOption Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while adding option',
        });
    }
};

/**
 * Rename/Update an option inside a specification
 * PUT /api/admin/specification/:id/options/:optionId or POST /api/admin/specification/option/update
 */
export const updateOption = async (req, res) => {
    try {
        const optionId = req.params.optionId || req.body.optionId || req.body.option_id || req.body._id;
        const id = req.params.id || req.body.specificationId || req.body.specification_id || req.body.id;

        if (!optionId || !mongoose.Types.ObjectId.isValid(optionId)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid option ID format',
            });
        }

        const { error, value } = validateOption(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: formatJoiError(error),
            });
        }

        const query = { _id: optionId };
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            query.specification_id = id;
        }

        const targetOption = await SpecificationOption.findOne(query);

        if (!targetOption) {
            return res.status(404).json({
                status: false,
                message: 'Option not found in this specification',
            });
        }

        const specId = targetOption.specification_id;
        const newName = value.name.trim();

        // Check duplicate excluding self
        const duplicate = await SpecificationOption.findOne({
            _id: { $ne: optionId },
            specification_id: specId,
            name: new RegExp(`^\\s*${escapeRegex(newName)}\\s*$`, 'i'),
        });

        if (duplicate) {
            return res.status(400).json({
                status: false,
                message: `Option "${newName}" already exists in this specification`,
            });
        }

        targetOption.name = newName;
        await targetOption.save();

        return res.status(200).json({
            status: true,
            message: 'Option updated successfully',
            data: targetOption,
        });
    } catch (err) {
        console.error('[Specification UpdateOption Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while updating option',
        });
    }
};

/**
 * Delete an option from a specification
 * Rule: Blocked while category, collection, or product uses it.
 * DELETE /api/admin/specification/:id/options/:optionId or POST /api/admin/specification/option/delete
 */
export const deleteOption = async (req, res) => {
    try {
        const optionId = req.params.optionId || req.body.optionId || req.body.option_id || req.body._id;
        const id = req.params.id || req.body.specificationId || req.body.specification_id || req.body.id;

        if (!optionId || !mongoose.Types.ObjectId.isValid(optionId)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid option ID format',
            });
        }

        const query = { _id: optionId };
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            query.specification_id = id;
        }

        const option = await SpecificationOption.findOne(query);

        if (!option) {
            return res.status(404).json({
                status: false,
                message: 'Option not found in this specification',
            });
        }

        const specId = option.specification_id;

        // Guard: check if option is used
        const is_used = await checkOptionUsage(optionId, specId);
        if (is_used) {
            return res.status(400).json({
                status: false,
                message: 'Cannot delete option because it is currently in use in categories, collections, or products.',
            });
        }

        await SpecificationOption.findByIdAndDelete(optionId);

        return res.status(200).json({
            status: true,
            message: 'Option deleted successfully',
        });
    } catch (err) {
        console.error('[Specification DeleteOption Error]:', err);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while deleting option',
        });
    }
};

