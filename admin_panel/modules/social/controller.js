import { SocialLink, SocialPost } from './model.js';

// Standard platform metadata helpers
export const SUPPORTED_PLATFORMS = [
    { key: 'instagram', label: 'Instagram', defaultOrder: 1 },
    { key: 'facebook', label: 'Facebook', defaultOrder: 2 },
    { key: 'thread', label: 'Threads', defaultOrder: 3 },
    { key: 'youtube', label: 'YouTube', defaultOrder: 4 },
    { key: 'x', label: 'X (Twitter)', defaultOrder: 5 },
    { key: 'pinterest', label: 'Pinterest', defaultOrder: 6 },
    { key: 'tumblr', label: 'Tumblr', defaultOrder: 7 },
    { key: 'linkedin', label: 'LinkedIn', defaultOrder: 8 },
    { key: 'meesho', label: 'Meesho Store', defaultOrder: 9 },
    { key: 'whatsapp', label: 'WhatsApp', defaultOrder: 10 },
    { key: 'snapchat', label: 'Snapchat', defaultOrder: 11 },
];

/**
 * Get all social links and posts
 * GET /api/admin/social or POST /api/admin/social/list
 */
export const getSocialData = async (req, res) => {
    try {
        const linksList = await SocialLink.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
        const posts = await SocialPost.find().sort({ sortOrder: 1, createdAt: -1 }).lean();

        // Convert links array into a dictionary map for direct lookup: { instagram: 'https://...', ... }
        const linksMap = {};
        linksList.forEach((item) => {
            if (item.url && item.status === 'active') {
                linksMap[item.platform] = item.url;
            }
        });

        return res.status(200).json({
            status: true,
            data: {
                linksList,
                linksMap,
                posts,
                supportedPlatforms: SUPPORTED_PLATFORMS,
            },
        });
    } catch (err) {
        console.error('[Get Social Data Error]:', err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Upsert / Set a social link for a platform
 * POST /api/admin/social/link
 */
export const upsertSocialLink = async (req, res) => {
    try {
        const platform = (req.body.platform || '').trim().toLowerCase();
        const rawUrl = (req.body.url || '').trim();
        const title = (req.body.title || '').trim();
        const status = req.body.status || 'active';

        if (!platform) {
            return res.status(400).json({ status: false, message: 'Platform name is required' });
        }

        const platformMeta = SUPPORTED_PLATFORMS.find((p) => p.key === platform);
        const resolvedTitle = title || (platformMeta ? platformMeta.label : platform.toUpperCase());
        const sortOrder = platformMeta ? platformMeta.defaultOrder : 50;

        const updated = await SocialLink.findOneAndUpdate(
            { platform },
            {
                platform,
                title: resolvedTitle,
                url: rawUrl,
                status,
                sortOrder,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            status: true,
            message: `Social link for ${resolvedTitle} saved successfully`,
            data: updated,
        });
    } catch (err) {
        console.error('[Upsert Social Link Error]:', err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Delete a social link
 * POST /api/admin/social/link/delete or DELETE /api/admin/social/link/:platform
 */
export const deleteSocialLink = async (req, res) => {
    try {
        const platform = (req.params.platform || req.body.platform || '').trim().toLowerCase();
        if (!platform) {
            return res.status(400).json({ status: false, message: 'Platform name is required' });
        }

        await SocialLink.findOneAndDelete({ platform });

        return res.status(200).json({
            status: true,
            message: `Social link for ${platform} deleted successfully`,
        });
    } catch (err) {
        console.error('[Delete Social Link Error]:', err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * List social media posts / reels
 * GET or POST /api/admin/social/posts
 */
export const listSocialPosts = async (req, res) => {
    try {
        const posts = await SocialPost.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
        return res.status(200).json({ status: true, data: posts });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Create social media post / video
 * POST /api/admin/social/post/create
 */
export const createSocialPost = async (req, res) => {
    try {
        const { mediaType = 'video', mediaUrl, thumbnailUrl, caption, platform = 'instagram', link, status = 'active', sortOrder = 0 } = req.body;

        if (!mediaUrl || !mediaUrl.trim()) {
            return res.status(400).json({ status: false, message: 'Media URL is required' });
        }

        const newPost = await SocialPost.create({
            mediaType,
            mediaUrl: mediaUrl.trim(),
            thumbnailUrl: (thumbnailUrl || '').trim(),
            caption: (caption || '').trim(),
            platform: (platform || 'instagram').trim().toLowerCase(),
            link: (link || '').trim(),
            status,
            sortOrder: Number(sortOrder) || 0,
        });

        return res.status(201).json({
            status: true,
            message: 'Social post created successfully',
            data: newPost,
        });
    } catch (err) {
        console.error('[Create Social Post Error]:', err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Update social media post / video
 * POST or PUT /api/admin/social/post/update
 */
export const updateSocialPost = async (req, res) => {
    try {
        const id = req.body.id || req.body._id || req.params.id;
        if (!id) {
            return res.status(400).json({ status: false, message: 'Post ID is required' });
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        const updated = await SocialPost.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ status: false, message: 'Social post not found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Social post updated successfully',
            data: updated,
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Delete social media post / video
 * POST /api/admin/social/post/delete or DELETE /api/admin/social/post/:id
 */
export const deleteSocialPost = async (req, res) => {
    try {
        const id = req.body.id || req.body._id || req.params.id;
        if (!id) {
            return res.status(400).json({ status: false, message: 'Post ID is required' });
        }

        await SocialPost.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Social post deleted successfully',
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

/**
 * Public website endpoint for social links & active posts
 * GET /api/website/social
 */
export const getPublicSocial = async (req, res) => {
    try {
        const linksList = await SocialLink.find({ status: 'active', url: { $exists: true, $ne: '' } })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();

        const linksMap = {};
        linksList.forEach((item) => {
            if (item.url && item.url.trim()) {
                linksMap[item.platform] = item.url.trim();
            }
        });

        // Resolve Flipkart link to Meesho store link if direct Flipkart link is not provided
        const meeshoUrl = linksMap['meesho'] || '';
        if (!linksMap['flipkart'] && meeshoUrl) {
            linksMap['flipkart'] = meeshoUrl;
        }

        const posts = await SocialPost.find({ status: 'active' })
            .sort({ sortOrder: 1, createdAt: -1 })
            .limit(16)
            .lean();

        return res.status(200).json({
            status: true,
            data: {
                links: linksMap,
                linksList,
                posts,
                meeshoUrl,
                flipkartUrl: linksMap['flipkart'] || meeshoUrl,
            },
        });
    } catch (err) {
        console.error('[Public Social Error]:', err);
        return res.status(500).json({ status: false, message: err.message });
    }
};
