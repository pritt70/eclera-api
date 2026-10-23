import mongoose from 'mongoose';
import AbandonedCart from './model.js';
import Product from '../product/model.js';
import {
    validateCreateCart,
    validateChangeStatus,
} from './helper/validation.js';

/**
 * Seed sample abandoned carts if database has 0 records
 */
const autoSeedIfEmpty = async () => {
    try {
        const count = await AbandonedCart.countDocuments();
        if (count > 0) return;

        const sampleProducts = await Product.find().limit(3).lean();

        const samples = [
            {
                cartNumber: 'CRT-5001',
                customer: {
                    name: 'Meera Nair',
                    email: 'meera.nair@gmail.com',
                    phone: '+91 9845012345',
                },
                items: [
                    {
                        productName: sampleProducts[0]?.name || 'Hydrating Face Serum 30ml',
                        variantName: 'Default',
                        price: 799,
                        quantity: 1,
                        subtotal: 799,
                        image: sampleProducts[0]?.thumbnail?.url || '',
                    },
                    {
                        productName: 'Rosewater Soothing Toner 200ml',
                        variantName: 'Default',
                        price: 349,
                        quantity: 1,
                        subtotal: 349,
                        image: '',
                    },
                ],
                cartTotal: 1148,
                recoveryStatus: 'abandoned',
                emailSentCount: 0,
                lastEmailSentAt: null,
                lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hrs ago
                checkoutStep: 'shipping_address',
                notes: 'Left at shipping address entry step.',
            },
            {
                cartNumber: 'CRT-5002',
                customer: {
                    name: 'Kunal Joshi',
                    email: 'kunal.joshi@outlook.com',
                    phone: '+91 9765432109',
                },
                items: [
                    {
                        productName: sampleProducts[1]?.name || 'Vitamin C Brightening Moisturizer',
                        variantName: '50ml',
                        price: 549,
                        quantity: 2,
                        subtotal: 1098,
                        image: sampleProducts[1]?.thumbnail?.url || '',
                    },
                ],
                cartTotal: 1098,
                recoveryStatus: 'email_sent',
                emailSentCount: 1,
                lastEmailSentAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hrs ago
                lastActivityAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
                checkoutStep: 'payment_pending',
                notes: '10% discount recovery reminder sent.',
            },
            {
                cartNumber: 'CRT-5003',
                customer: {
                    name: 'Ritu Kapoor',
                    email: 'ritu.k@yahoo.com',
                    phone: '+91 9911223344',
                },
                items: [
                    {
                        productName: 'Ultra Glow Clay Face Mask',
                        variantName: '100g',
                        price: 499,
                        quantity: 1,
                        subtotal: 499,
                        image: '',
                    },
                ],
                cartTotal: 499,
                recoveryStatus: 'recovered',
                emailSentCount: 1,
                lastEmailSentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                recoveredAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
                lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                checkoutStep: 'payment_pending',
                notes: 'Recovered via reminder email.',
            },
        ];

        await AbandonedCart.insertMany(samples);
        console.log('[Seed] Sample abandoned carts created successfully');
    } catch (err) {
        console.error('[Seed] Error seeding abandoned carts:', err.message);
    }
};

/**
 * List abandoned carts
 */
export const list = async (req, res) => {
    try {
        await autoSeedIfEmpty();

        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 10, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim().toLowerCase();

        const query = {};

        if (status && status !== 'all') {
            query.recoveryStatus = status;
        }

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { cartNumber: { $regex: escaped, $options: 'i' } },
                { 'customer.name': { $regex: escaped, $options: 'i' } },
                { 'customer.email': { $regex: escaped, $options: 'i' } },
                { 'customer.phone': { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [carts, total, statusAgg] = await Promise.all([
            AbandonedCart.find(query)
                .sort({ lastActivityAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AbandonedCart.countDocuments(query),
            AbandonedCart.aggregate([
                {
                    $group: {
                        _id: '$recoveryStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const statusCounts = {
            all: await AbandonedCart.countDocuments(),
            abandoned: 0,
            email_sent: 0,
            recovered: 0,
            expired: 0,
        };
        statusAgg.forEach((item) => {
            if (item._id && statusCounts[item._id] !== undefined) {
                statusCounts[item._id] = item.count;
            }
        });

        return res.status(200).json({
            status: true,
            message: 'Abandoned carts retrieved successfully',
            data: {
                carts,
                statusCounts,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                },
            },
        });
    } catch (error) {
        console.error('Error listing abandoned carts:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Internal server error while fetching carts',
        });
    }
};

/**
 * Get Cart by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing cart ID',
            });
        }

        const cart = await AbandonedCart.findById(id).lean();
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: 'Abandoned cart not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Cart details retrieved',
            data: { cart },
        });
    } catch (error) {
        console.error('Error getting cart:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Internal server error',
        });
    }
};

/**
 * Create an abandoned cart
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreateCart(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
            });
        }

        let calculatedTotal = 0;
        const processedItems = value.items.map((it) => {
            const itemSub = (it.price || 0) * (it.quantity || 1);
            calculatedTotal += itemSub;
            return {
                ...it,
                subtotal: itemSub,
            };
        });

        const cartTotal = value.cartTotal !== undefined ? Number(value.cartTotal) : calculatedTotal;

        let cartNumber = value.cartNumber;
        if (!cartNumber) {
            const count = await AbandonedCart.countDocuments();
            cartNumber = `CRT-${5000 + count + 1}`;
        }

        const newCart = new AbandonedCart({
            ...value,
            cartNumber,
            items: processedItems,
            cartTotal,
        });

        await newCart.save();

        return res.status(201).json({
            status: true,
            message: `Abandoned cart ${cartNumber} logged successfully`,
            data: { cart: newCart },
        });
    } catch (error) {
        console.error('Error creating cart:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to save abandoned cart',
        });
    }
};

/**
 * Send recovery email action
 */
export const sendRecovery = async (req, res) => {
    try {
        const id = req.body?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing cart ID',
            });
        }

        const cart = await AbandonedCart.findById(id);
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: 'Cart not found',
            });
        }

        cart.recoveryStatus = 'email_sent';
        cart.emailSentCount = (cart.emailSentCount || 0) + 1;
        cart.lastEmailSentAt = new Date();
        await cart.save();

        return res.status(200).json({
            status: true,
            message: `Recovery reminder sent to ${cart.customer.email}`,
            data: { cart },
        });
    } catch (error) {
        console.error('Error sending recovery:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to send recovery notification',
        });
    }
};

/**
 * Change status (e.g. mark recovered)
 */
export const changeStatus = async (req, res) => {
    try {
        const id = req.body?.id || req.query?.id;
        const { error, value } = validateChangeStatus({ ...req.body, id });
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
            });
        }

        const cart = await AbandonedCart.findById(id);
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: 'Cart not found',
            });
        }

        cart.recoveryStatus = value.recoveryStatus;
        if (value.recoveryStatus === 'recovered') {
            cart.recoveredAt = new Date();
        }

        await cart.save();

        return res.status(200).json({
            status: true,
            message: `Cart status updated to ${cart.recoveryStatus}`,
            data: { cart },
        });
    } catch (error) {
        console.error('Error updating status:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to update recovery status',
        });
    }
};

/**
 * Delete abandoned cart
 */
export const deleteCart = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing cart ID',
            });
        }

        const cart = await AbandonedCart.findByIdAndDelete(id);
        if (!cart) {
            return res.status(404).json({
                status: false,
                message: 'Cart not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: `Cart ${cart.cartNumber} deleted successfully`,
        });
    } catch (error) {
        console.error('Error deleting cart:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to delete cart',
        });
    }
};
