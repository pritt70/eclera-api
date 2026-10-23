import express from 'express';
import authRouter from '../modules/auth/routes.js';
import categoryRouter from '../modules/category/routes.js';
import specificationRouter from '../modules/specification/routes.js';
import collectionRouter from '../modules/collections/routes.js';
import uploadRouter from '../modules/upload/routes.js';
import productRouter from '../modules/product/routes.js';
import bannerRouter from '../modules/banner/routes.js';
import customerRouter from '../modules/customer/routes.js';
import discountRouter from '../modules/discount/routes.js';
import orderRouter from '../modules/order/routes.js';
import abandonedCartRouter from '../modules/abandoned_cart/routes.js';
import policyRouter from '../modules/policy/routes.js';

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: true, message: 'Admin Panel API operational' });
});

router.use('/auth', authRouter);
router.use('/category', categoryRouter);
router.use('/categories', categoryRouter);
router.use('/specification', specificationRouter);
router.use('/specifications', specificationRouter);
router.use('/collection', collectionRouter);
router.use('/collections', collectionRouter);
router.use('/uploads', uploadRouter);
router.use('/upload', uploadRouter);
router.use('/product', productRouter);
router.use('/products', productRouter);
router.use('/banner', bannerRouter);
router.use('/banners', bannerRouter);
router.use('/customer', customerRouter);
router.use('/customers', customerRouter);
router.use('/discount', discountRouter);
router.use('/discounts', discountRouter);
router.use('/order', orderRouter);
router.use('/orders', orderRouter);
router.use('/abandoned-cart', abandonedCartRouter);
router.use('/abandoned-carts', abandonedCartRouter);
router.use('/abandoned_cart', abandonedCartRouter);
router.use('/policy', policyRouter);
router.use('/policies', policyRouter);

export default router;
