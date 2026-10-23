import mongoose from 'mongoose';
import Banner from './model.js';
import {
    validateCreate,
    validateUpdate,
    validateChangeStatus,
} from './helper/validation.js';

function parseImage(img) {
    if (!img) return { url: '', key: '', publicUrl: '' };
    if (typeof img === 'string') {
        const u = img.trim();
        return { url: u, publicUrl: u, key: '' };
    }
    if (typeof img === 'object') {
        const u = String(img.url || img.publicUrl || '').trim();
        return {
            url: u,
            publicUrl: u,
            key: String(img.key || '').trim(),
        };
    }
    return { url: '', key: '', publicUrl: '' };
}

/**
 * List banners with pagination, search, status and position filtering
 */
export const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || req.body?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || req.body?.limit || 10, 10)));
        const search = (req.query.search || req.body?.search || '').trim();
        const status = (req.query.status || req.body?.status || '').trim();
        const position = (req.query.position || req.body?.position || '').trim();

        const category = (req.query.category || req.body?.category || '').trim();

        const query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (position && position !== 'all') {
            query.position = position;
        }

        if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
            query.category = category;
        }

        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { title: regex },
                { subtitle: regex },
                { link: regex },
            ];
        }

        const skip = (page - 1) * limit;

        const [banners, total] = await Promise.all([
            Banner.find(query)
                .populate('category', 'name slug')
                .sort({ sortOrder: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Banner.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formattedBanners = banners.map((b) => {
            const imgUrl = b.image?.publicUrl || b.image?.url || '';
            const mobUrl = b.mobileImage?.publicUrl || b.mobileImage?.url || imgUrl;
            return {
                ...b,
                image: {
                    url: imgUrl,
                    publicUrl: imgUrl,
                    key: b.image?.key || '',
                },
                mobileImage: {
                    url: mobUrl,
                    publicUrl: mobUrl,
                    key: b.mobileImage?.key || '',
                },
            };
        });

        return res.status(200).json({
            status: true,
            message: 'Banners retrieved successfully',
            data: {
                banners: formattedBanners,
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
        console.error('Error fetching banners list:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve banners',
            error: error.message,
        });
    }
};

/**
 * Get banner by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id || req.query?.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Banner ID is required',
            });
        }

        const banner = await Banner.findById(id).populate('category', 'name slug').lean();

        if (!banner) {
            return res.status(404).json({
                status: false,
                message: 'Banner not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Banner retrieved successfully',
            data: banner,
        });
    } catch (error) {
        console.error('Error retrieving banner:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve banner',
            error: error.message,
        });
    }
};

/**
 * Create a new banner
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

        const image = parseImage(value.image);
        if (!image.url) {
            return res.status(400).json({
                status: false,
                message: 'Banner image URL is required',
            });
        }

        const mobileImage = parseImage(value.mobileImage);
        const categoryId = value.category && mongoose.Types.ObjectId.isValid(value.category) ? value.category : null;

        const newBanner = new Banner({
            title: value.title ? value.title.trim() : 'Banner',
            subtitle: value.subtitle ? value.subtitle.trim() : '',
            image,
            mobileImage,
            link: value.link ? value.link.trim() : '',
            buttonText: value.buttonText ? value.buttonText.trim() : 'Shop Now',
            position: value.position || 'home_hero',
            category: categoryId,
            status: value.status || 'active',
            sortOrder: Number(value.sortOrder) || 0,
            startDate: value.startDate || null,
            endDate: value.endDate || null,
        });

        const saved = await newBanner.save();
        await saved.populate('category', 'name slug');

        return res.status(201).json({
            status: true,
            message: 'Banner created successfully',
            data: saved,
        });
    } catch (error) {
        console.error('Error creating banner:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to create banner',
            error: error.message,
        });
    }
};

/**
 * Update an existing banner
 */
export const update = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Banner ID is required',
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

        const existing = await Banner.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: false,
                message: 'Banner not found',
            });
        }

        if (value.title !== undefined) existing.title = value.title.trim();
        if (value.subtitle !== undefined) existing.subtitle = value.subtitle ? value.subtitle.trim() : '';
        if (value.image !== undefined) {
            const parsed = parseImage(value.image);
            if (parsed.url) existing.image = parsed;
        }
        if (value.mobileImage !== undefined) {
            existing.mobileImage = parseImage(value.mobileImage);
        }
        if (value.link !== undefined) existing.link = value.link ? value.link.trim() : '';
        if (value.buttonText !== undefined) existing.buttonText = value.buttonText ? value.buttonText.trim() : '';
        if (value.position !== undefined) existing.position = value.position;
        if (value.category !== undefined) {
            existing.category = value.category && mongoose.Types.ObjectId.isValid(value.category) ? value.category : null;
        }
        if (value.status !== undefined) existing.status = value.status;
        if (value.sortOrder !== undefined) existing.sortOrder = Number(value.sortOrder) || 0;
        if (value.startDate !== undefined) existing.startDate = value.startDate || null;
        if (value.endDate !== undefined) existing.endDate = value.endDate || null;

        const updated = await existing.save();
        await updated.populate('category', 'name slug');

        return res.status(200).json({
            status: true,
            message: 'Banner updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Error updating banner:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update banner',
            error: error.message,
        });
    }
};

/**
 * Change banner status (active / inactive)
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Banner ID is required',
            });
        }

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json({
                status: false,
                message: 'Banner not found',
            });
        }

        let newStatus = req.body?.status;
        if (!newStatus || !['active', 'inactive'].includes(newStatus)) {
            // Toggle
            newStatus = banner.status === 'active' ? 'inactive' : 'active';
        }

        banner.status = newStatus;
        await banner.save();

        return res.status(200).json({
            status: true,
            message: `Banner status changed to ${newStatus}`,
            data: { id: banner._id, status: banner.status },
        });
    } catch (error) {
        console.error('Error changing banner status:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to change banner status',
            error: error.message,
        });
    }
};

/**
 * Delete a banner
 */
export const deleteBanner = async (req, res) => {
    try {
        const id = req.params.id || req.body?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Valid Banner ID is required',
            });
        }

        const banner = await Banner.findByIdAndDelete(id);
        if (!banner) {
            return res.status(404).json({
                status: false,
                message: 'Banner not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Banner deleted successfully',
            data: { id },
        });
    } catch (error) {
        console.error('Error deleting banner:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to delete banner',
            error: error.message,
        });
    }
};

/**
 * Public endpoint to fetch active banners for website by position
 */
export const getActiveBanners = async (req, res) => {
    try {
        const position = (req.query.position || req.body?.position || 'home_hero').trim();
        const now = new Date();

        const query = {
            status: 'active',
            $and: [
                {
                    $or: [
                        { startDate: null },
                        { startDate: { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { endDate: null },
                        { endDate: { $gte: now } },
                    ],
                },
            ],
        };

        if (position && position !== 'all') {
            query.position = position;
        }

        const category = (req.query.category || req.body?.category || '').trim();
        if (category && mongoose.Types.ObjectId.isValid(category)) {
            query.$or = [{ category }, { category: null }];
        }

        const banners = await Banner.find(query)
            .populate('category', 'name slug')
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        return res.status(200).json({
            status: true,
            message: 'Active banners retrieved',
            data: banners,
        });
    } catch (error) {
        console.error('Error fetching active banners for website:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to retrieve banners',
            error: error.message,
        });
    }
};
