import express from 'express';
import { getActiveBanners } from '../../admin_panel/modules/banner/controller.js';
import { getPublicCoupons } from '../../admin_panel/modules/discount/controller.js';
import { getPublicPolicies, getPublicPolicyBySlug } from '../../admin_panel/modules/policy/controller.js';
import Category from '../../admin_panel/modules/category/model.js';

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: true, message: 'Website API operational' });
});

router.get('/banners', getActiveBanners);
router.get('/banner', getActiveBanners);
router.post('/banners', getActiveBanners);

router.get('/coupons', getPublicCoupons);
router.get('/discount/coupons', getPublicCoupons);

// Public Policies
router.get('/policies', getPublicPolicies);
router.get('/policies/:slug', getPublicPolicyBySlug);
router.get('/policy/:slug', getPublicPolicyBySlug);

// Public Categories for Header & Navigation
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({ status: 'active' })
            .select('name slug image productsCount sortOrder')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        return res.json({ status: true, data: categories });
    } catch (e) {
        return res.status(500).json({ status: false, message: e.message });
    }
});

// Public Collections
router.get('/collections', async (req, res) => {
    try {
        const Collection = (await import('../../admin_panel/modules/collections/model.js')).default;
        const collections = await Collection.find({ status: 'active' })
            .select('name slug image sortOrder')
            .sort({ sortOrder: 1, name: 1 })
            .lean();
        return res.json({ status: true, data: collections });
    } catch (e) {
        return res.status(500).json({ status: false, message: e.message });
    }
});

export default router;
