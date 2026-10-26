import mongoose from 'mongoose';
import Product from './model.js';
import Category from '../category/model.js';
import { generateUniqueSlug, slugify } from './helper/slug.js';
import {
    validateCreate,
    validateUpdate,
    validateStatus,
    validateReorder,
} from './helper/validation.js';

/**
 * Normalizes specifications array to MongoDB schema structure
 */
function parseProductSpecifications(specs) {
    if (!Array.isArray(specs)) return [];
    return specs
        .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') {
                return { specification: item, options: [] };
            }
            const specId =
                item.specification ||
                item.specification_id ||
                item.specificationId ||
                item._id ||
                item.id;
            if (!specId) return null;

            const rawOptions = item.options || item.selectedOptionIds || [];
            const optionIds = Array.isArray(rawOptions)
                ? rawOptions
                    .map((opt) => (typeof opt === 'object' && opt !== null ? opt._id || opt.id : opt))
                    .filter((id) => mongoose.Types.ObjectId.isValid(id))
                : [];

            return {
                specification: specId,
                options: optionIds,
            };
        })
        .filter((item) => item !== null && mongoose.Types.ObjectId.isValid(item.specification));
}

/**
 * Normalizes images array
 */
function parseProductImages(images) {
    if (!Array.isArray(images)) return [];
    return images
        .map((img) => {
            if (!img) return null;
            if (typeof img === 'string') {
                const u = img.trim();
                return { url: u, publicUrl: u, key: '' };
            }
            if (typeof img === 'object') {
                const u = String(img.url || img.publicUrl || '').trim();
                if (!u && !img.key) return null;
                return {
                    url: u,
                    publicUrl: u,
                    key: img.key ? String(img.key).trim() : '',
                };
            }
            return null;
        })
        .filter(Boolean);
}

/**
 * Syncs product grouping bi-directionally across sibling products
 */
async function syncProductGroup(currentProduct, linkedProductIds = []) {
    if (!currentProduct || !currentProduct.group?.enabled) return;

    const currentId = currentProduct._id;
    const groupId = currentProduct.group.groupId || `grp_${currentId}`;
    const groupTitle = currentProduct.group.groupTitle || 'Available Options';
    const attributeName = currentProduct.group.attributeName || 'Color';

    // All product IDs in this cluster
    const validLinkedIds = linkedProductIds
        .map((id) => id?.toString())
        .filter((id) => id && id !== currentId.toString() && mongoose.Types.ObjectId.isValid(id));

    // Update current product with groupId
    currentProduct.group.groupId = groupId;
    currentProduct.group.linkedProducts = validLinkedIds;

    // For each linked product, ensure they belong to this group and have others linked
    for (const siblingId of validLinkedIds) {
        try {
            const siblingLinked = [
                currentId.toString(),
                ...validLinkedIds.filter((id) => id !== siblingId),
            ];

            await Product.findByIdAndUpdate(siblingId, {
                $set: {
                    'group.enabled': true,
                    'group.groupId': groupId,
                    'group.groupTitle': groupTitle,
                    'group.attributeName': attributeName,
                    'group.linkedProducts': siblingLinked,
                },
            });
        } catch (err) {
            console.error(`Failed to sync group to sibling product ${siblingId}:`, err);
        }
    }
}

/**
 * List products with filtering, search, and pagination
 */
export const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || req.body?.page || 1, 10));
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || req.body?.limit || 10, 10)));
        const search = (req.query.search || req.body?.search || '').toString().trim();
        const status = (req.query.status || req.body?.status || '').toString().trim();
        const category = (req.query.category || req.body?.category || '').toString().trim();
        const collection = (req.query.collection || req.body?.collection || '').toString().trim();
        const excludeId = (req.query.excludeId || req.body?.excludeId || req.body?.exclude || '').toString().trim();
        const groupId = (req.query.groupId || req.body?.groupId || '').toString().trim();

        const query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (category && mongoose.Types.ObjectId.isValid(category)) {
            query.category = new mongoose.Types.ObjectId(category);
        }

        if (collection && mongoose.Types.ObjectId.isValid(collection)) {
            query.collections = new mongoose.Types.ObjectId(collection);
        }

        if (groupId) {
            query['group.groupId'] = groupId;
        }

        if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
            query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
        }

        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { name: regex },
                { slug: regex },
                { sku: regex },
                { description: regex },
            ];
        }

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category', '_id name slug')
                .populate('collections', '_id name slug')
                .populate('specifications.specification', '_id name slug is_veriant is_variant')
                .populate('specifications.options', '_id name sort_order')
                .populate('relatedProducts', '_id name slug price comparePrice stock images status')
                .populate('group.linkedProducts', '_id name slug price comparePrice stock images group status')
                .sort({ sortOrder: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const normalizedProducts = products.map((p) => {
            const normImgs = Array.isArray(p.images)
                ? p.images.map((img) => {
                    const u = String(img?.url || img?.publicUrl || (typeof img === 'string' ? img : '')).trim();
                    const k = String(img?.key || '').trim();
                    return { url: u, publicUrl: u, key: k };
                })
                : [];
            return {
                ...p,
                images: normImgs,
            };
        });

        return res.status(200).json({
            status: true,
            message: 'Products retrieved successfully',
            data: {
                products: normalizedProducts,
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
        console.error('Error fetching products list:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve products',
            error: error.message,
        });
    }
};

/**
 * Get product by ID or Slug
 */
export const getById = async (req, res) => {
    try {
        const idOrSlug = req.params.id || req.body?.id || req.query?.id;

        if (!idOrSlug) {
            return res.status(400).json({
                status: false,
                message: 'Product ID or Slug is required',
            });
        }

        const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
        const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toString().toLowerCase() };

        let product = await Product.findOne(query)
            .populate('category', '_id name slug specifications')
            .populate('collections', '_id name slug')
            .populate('specifications.specification', '_id name slug is_veriant is_variant options')
            .populate('specifications.options', '_id name sort_order')
            .populate('relatedProducts', '_id name slug price comparePrice stock images category status')
            .populate('group.linkedProducts', '_id name slug price comparePrice stock images group status')
            .lean();

        if (!product) {
            return res.status(404).json({
                status: false,
                message: 'Product not found',
            });
        }

        if (Array.isArray(product.images)) {
            product.images = product.images.map((img) => {
                const u = String(img?.url || img?.publicUrl || (typeof img === 'string' ? img : '')).trim();
                const k = String(img?.key || '').trim();
                return { url: u, publicUrl: u, key: k };
            });
        }

        // If product has a group with groupId, also load all siblings sharing that groupId
        if (product.group?.enabled && product.group?.groupId) {
            const siblingProducts = await Product.find({
                'group.groupId': product.group.groupId,
                _id: { $ne: product._id },
            })
                .select('_id name slug price comparePrice stock images group status')
                .lean();

            product.siblingGroupProducts = siblingProducts;
        }

        return res.status(200).json({
            status: true,
            message: 'Product retrieved successfully',
            data: product,
        });
    } catch (error) {
        console.error('Error fetching product by ID/Slug:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve product details',
            error: error.message,
        });
    }
};

/**
 * Create a new product
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

        // 1. Verify Category exists
        const categoryExists = await Category.findById(value.category).lean();
        if (!categoryExists) {
            return res.status(400).json({
                status: false,
                message: 'Specified category does not exist.',
            });
        }

        // 2. Generate unique slug
        const slug = await generateUniqueSlug(value.slug || value.name);

        // 3. Normalize structures
        const specifications = parseProductSpecifications(value.specifications);
        const images = parseProductImages(value.images);

        // Normalize related products (must be valid ObjectIds)
        const relatedProducts = Array.isArray(value.relatedProducts)
            ? value.relatedProducts.filter((id) => mongoose.Types.ObjectId.isValid(id))
            : [];

        // 4. Normalize group settings
        const groupData = {
            enabled: Boolean(value.group?.enabled),
            groupId: value.group?.groupId?.trim() || '',
            groupTitle: value.group?.groupTitle?.trim() || 'Available Options',
            attributeName: value.group?.attributeName?.trim() || 'Color',
            attributeValue: value.group?.attributeValue?.trim() || '',
            swatchColor: value.group?.swatchColor?.trim() || '',
            swatchImage: value.group?.swatchImage || { url: '', key: '' },
            linkedProducts: Array.isArray(value.group?.linkedProducts)
                ? value.group.linkedProducts.filter((id) => mongoose.Types.ObjectId.isValid(id))
                : [],
        };

        // If grouping enabled but no groupId provided, generate a unique groupId
        if (groupData.enabled && !groupData.groupId) {
            groupData.groupId = `grp_${new mongoose.Types.ObjectId()}`;
        }

        // 5. Construct Product Document
        const newProduct = new Product({
            name: value.name.trim(),
            slug,
            sku: value.sku ? value.sku.trim() : '',
            barcode: value.barcode ? value.barcode.trim() : '',
            category: value.category,
            collections: value.collections || [],
            description: value.description ? value.description.trim() : '',
            price: Number(value.price) || 0,
            comparePrice: Number(value.comparePrice) || 0,
            costPrice: Number(value.costPrice) || 0,
            stock: Number(value.stock) || 0,
            trackStock: value.trackStock !== undefined ? Boolean(value.trackStock) : true,
            images,
            specifications,
            relatedProducts,
            group: groupData,
            status: value.status || 'active',
            sortOrder: Number(value.sortOrder) || 0,
            seoTitle: value.seoTitle ? value.seoTitle.trim() : '',
            seoDescription: value.seoDescription ? value.seoDescription.trim() : '',
            flipkartUrl: value.flipkartUrl ? value.flipkartUrl.trim() : '',
        });

        await newProduct.save();

        // 6. Bi-directionally sync grouping if enabled
        if (groupData.enabled && groupData.linkedProducts.length > 0) {
            await syncProductGroup(newProduct, groupData.linkedProducts);
            await newProduct.save();
        }

        // 7. Return populated created product
        const populated = await Product.findById(newProduct._id)
            .populate('category', '_id name slug')
            .populate('collections', '_id name slug')
            .populate('specifications.specification', '_id name slug is_veriant is_variant')
            .populate('specifications.options', '_id name sort_order')
            .populate('relatedProducts', '_id name slug price comparePrice stock images status')
            .populate('group.linkedProducts', '_id name slug price comparePrice stock images group status')
            .lean();

        return res.status(201).json({
            status: true,
            message: 'Product created successfully',
            data: populated,
        });
    } catch (error) {
        console.error('Error creating product:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                status: false,
                message: 'A product with this slug already exists.',
            });
        }
        return res.status(500).json({
            status: false,
            message: 'Failed to create product',
            error: error.message,
        });
    }
};

/**
 * Update an existing product
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.body?._id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Product ID is required',
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

        const existing = await Product.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: false,
                message: 'Product not found',
            });
        }

        // 1. Check Category if updated
        if (value.category) {
            const categoryExists = await Category.findById(value.category).lean();
            if (!categoryExists) {
                return res.status(400).json({
                    status: false,
                    message: 'Specified category does not exist.',
                });
            }
            existing.category = value.category;
        }

        // 2. Slug & Name
        if (value.name !== undefined) {
            existing.name = value.name.trim();
        }

        if (value.slug !== undefined && value.slug.trim()) {
            existing.slug = await generateUniqueSlug(value.slug, id);
        } else if (value.name !== undefined && !existing.slug) {
            existing.slug = await generateUniqueSlug(value.name, id);
        }

        // 3. Basic & Pricing fields
        if (value.sku !== undefined) existing.sku = value.sku.trim();
        if (value.barcode !== undefined) existing.barcode = value.barcode.trim();
        if (value.description !== undefined) existing.description = value.description.trim();
        if (value.price !== undefined) existing.price = Number(value.price) || 0;
        if (value.comparePrice !== undefined) existing.comparePrice = Number(value.comparePrice) || 0;
        if (value.costPrice !== undefined) existing.costPrice = Number(value.costPrice) || 0;
        if (value.stock !== undefined) existing.stock = Number(value.stock) || 0;
        if (value.trackStock !== undefined) existing.trackStock = Boolean(value.trackStock);
        if (value.status !== undefined) existing.status = value.status;
        if (value.sortOrder !== undefined) existing.sortOrder = Number(value.sortOrder) || 0;
        if (value.seoTitle !== undefined) existing.seoTitle = value.seoTitle.trim();
        if (value.seoDescription !== undefined) existing.seoDescription = value.seoDescription.trim();
        if (value.flipkartUrl !== undefined) existing.flipkartUrl = value.flipkartUrl.trim();

        if (value.collections !== undefined) {
            existing.collections = Array.isArray(value.collections) ? value.collections : [];
        }

        if (value.images !== undefined) {
            existing.images = parseProductImages(value.images);
        }

        if (value.specifications !== undefined) {
            existing.specifications = parseProductSpecifications(value.specifications);
        }

        if (value.relatedProducts !== undefined) {
            existing.relatedProducts = Array.isArray(value.relatedProducts)
                ? value.relatedProducts.filter((relId) => mongoose.Types.ObjectId.isValid(relId) && relId.toString() !== id)
                : [];
        }

        // 4. Product Group updates
        if (value.group !== undefined) {
            const grp = value.group || {};
            const isEnabled = Boolean(grp.enabled);

            let groupId = grp.groupId?.trim() || existing.group?.groupId || '';
            if (isEnabled && !groupId) {
                groupId = `grp_${existing._id}`;
            }

            const linked = Array.isArray(grp.linkedProducts)
                ? grp.linkedProducts.filter((lid) => mongoose.Types.ObjectId.isValid(lid) && lid.toString() !== id)
                : existing.group?.linkedProducts || [];

            existing.group = {
                enabled: isEnabled,
                groupId,
                groupTitle: grp.groupTitle?.trim() || existing.group?.groupTitle || 'Available Options',
                attributeName: grp.attributeName?.trim() || existing.group?.attributeName || 'Color',
                attributeValue: grp.attributeValue?.trim() || existing.group?.attributeValue || '',
                swatchColor: grp.swatchColor?.trim() || existing.group?.swatchColor || '',
                swatchImage: grp.swatchImage || existing.group?.swatchImage || { url: '', key: '' },
                linkedProducts: linked,
            };

            if (isEnabled) {
                await syncProductGroup(existing, linked);
            }
        }

        await existing.save();

        const updated = await Product.findById(id)
            .populate('category', '_id name slug')
            .populate('collections', '_id name slug')
            .populate('specifications.specification', '_id name slug is_veriant is_variant')
            .populate('specifications.options', '_id name sort_order')
            .populate('relatedProducts', '_id name slug price comparePrice stock images status')
            .populate('group.linkedProducts', '_id name slug price comparePrice stock images group status')
            .lean();

        return res.status(200).json({
            status: true,
            message: 'Product updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Error updating product:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                status: false,
                message: 'A product with this slug already exists.',
            });
        }
        return res.status(500).json({
            status: false,
            message: 'Failed to update product',
            error: error.message,
        });
    }
};

/**
 * Delete a product
 */
export const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Product ID is required',
            });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: false,
                message: 'Product not found',
            });
        }

        await Product.findByIdAndDelete(id);

        // Unlink from other products' relatedProducts and group.linkedProducts
        await Promise.all([
            Product.updateMany(
                { relatedProducts: id },
                { $pull: { relatedProducts: id } }
            ),
            Product.updateMany(
                { 'group.linkedProducts': id },
                { $pull: { 'group.linkedProducts': id } }
            ),
        ]);

        return res.status(200).json({
            status: true,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete product',
            error: error.message,
        });
    }
};

/**
 * Change status (active/inactive)
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        const status = req.body?.status;

        const { error } = validateStatus({ id, status });
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
            });
        }

        const updated = await Product.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true }
        )
            .select('_id name slug status')
            .lean();

        if (!updated) {
            return res.status(404).json({
                status: false,
                message: 'Product not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: `Product is now ${status}`,
            data: updated,
        });
    } catch (error) {
        console.error('Error changing product status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update product status',
            error: error.message,
        });
    }
};

/**
 * Reorder products
 */
export const reorder = async (req, res) => {
    try {
        const { error, value } = validateReorder(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details.map((d) => d.message).join(', '),
            });
        }

        const bulkOps = value.items.map((item) => ({
            updateOne: {
                filter: { _id: item.id },
                update: { $set: { sortOrder: item.sortOrder } },
            },
        }));

        await Product.bulkWrite(bulkOps);

        return res.status(200).json({
            status: true,
            message: 'Products reordered successfully',
        });
    } catch (error) {
        console.error('Error reordering products:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to reorder products',
            error: error.message,
        });
    }
};
