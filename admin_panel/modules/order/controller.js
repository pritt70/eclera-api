import mongoose from 'mongoose';
import Order from './model.js';
import Customer from '../customer/model.js';
import Product from '../product/model.js';
import {
    validateCreateOrder,
    validateUpdateOrder,
    validateChangeStatus,
} from './helper/validation.js';

/**
 * Seed initial sample orders if database has 0 orders
 */
const autoSeedIfEmpty = async () => {
    try {
        const count = await Order.countDocuments();
        if (count > 0) return;

        // Fetch sample products or fallback
        const sampleProducts = await Product.find().limit(3).lean();

        const samples = [
            {
                orderNumber: 'ORD-1001',
                customer: {
                    name: 'Priya Sharma',
                    email: 'priya.sharma@example.com',
                    phone: '+91 9876543210',
                },
                shippingAddress: {
                    name: 'Priya Sharma',
                    phone: '+91 9876543210',
                    street: 'Flat 402, Royal Palms, Link Road',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400053',
                    country: 'India',
                },
                items: [
                    {
                        productName: sampleProducts[0]?.name || 'Hydrating Face Serum 30ml',
                        variantName: 'Default',
                        sku: sampleProducts[0]?.sku || 'ECL-SRM-01',
                        price: 799,
                        quantity: 2,
                        subtotal: 1598,
                        image: sampleProducts[0]?.thumbnail?.url || '',
                    },
                    {
                        productName: sampleProducts[1]?.name || 'Vitamin C Brightening Moisturizer',
                        variantName: '50ml',
                        sku: sampleProducts[1]?.sku || 'ECL-MST-02',
                        price: 549,
                        quantity: 1,
                        subtotal: 549,
                        image: sampleProducts[1]?.thumbnail?.url || '',
                    },
                ],
                subtotal: 2147,
                discountAmount: 200,
                couponCode: 'WELCOME200',
                shippingFee: 0,
                totalAmount: 1947,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                orderStatus: 'delivered',
                tracking: {
                    carrier: 'BlueDart',
                    trackingNumber: 'BD74829104IN',
                    trackingUrl: 'https://bluedart.com',
                },
                notes: 'Delivered safely at front desk.',
            },
            {
                orderNumber: 'ORD-1002',
                customer: {
                    name: 'Ananya Verma',
                    email: 'ananya.v@gmail.com',
                    phone: '+91 9823456781',
                },
                shippingAddress: {
                    name: 'Ananya Verma',
                    phone: '+91 9823456781',
                    street: '12-B, Green Avenue, Indiranagar',
                    city: 'Bengaluru',
                    state: 'Karnataka',
                    postalCode: '560038',
                    country: 'India',
                },
                items: [
                    {
                        productName: sampleProducts[0]?.name || 'Ultra Glow Clay Face Mask',
                        variantName: '100g',
                        sku: 'ECL-MSK-05',
                        price: 499,
                        quantity: 1,
                        subtotal: 499,
                        image: sampleProducts[0]?.thumbnail?.url || '',
                    },
                ],
                subtotal: 499,
                discountAmount: 0,
                couponCode: '',
                shippingFee: 49,
                totalAmount: 548,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                orderStatus: 'shipped',
                tracking: {
                    carrier: 'Delhivery',
                    trackingNumber: 'DEL99482104',
                    trackingUrl: 'https://delhivery.com',
                },
                notes: 'Shipment in transit.',
            },
            {
                orderNumber: 'ORD-1003',
                customer: {
                    name: 'Rahul Mehta',
                    email: 'rahul.mehta@outlook.com',
                    phone: '+91 9123456789',
                },
                shippingAddress: {
                    name: 'Rahul Mehta',
                    phone: '+91 9123456789',
                    street: 'Sector 14, House No. 88',
                    city: 'Gurugram',
                    state: 'Haryana',
                    postalCode: '122001',
                    country: 'India',
                },
                items: [
                    {
                        productName: 'Gentle Foaming Cleanser 150ml',
                        variantName: 'Standard',
                        sku: 'ECL-CLN-01',
                        price: 399,
                        quantity: 2,
                        subtotal: 798,
                        image: '',
                    },
                ],
                subtotal: 798,
                discountAmount: 0,
                couponCode: '',
                shippingFee: 0,
                totalAmount: 798,
                paymentMethod: 'cod',
                paymentStatus: 'pending',
                orderStatus: 'processing',
                tracking: {
                    carrier: '',
                    trackingNumber: '',
                    trackingUrl: '',
                },
                notes: 'Call before delivery.',
            },
            {
                orderNumber: 'ORD-1004',
                customer: {
                    name: 'Sneha Patel',
                    email: 'sneha.patel@gmail.com',
                    phone: '+91 9988776655',
                },
                shippingAddress: {
                    name: 'Sneha Patel',
                    phone: '+91 9988776655',
                    street: '304, Shanti Arcade, Bodakdev',
                    city: 'Ahmedabad',
                    state: 'Gujarat',
                    postalCode: '380054',
                    country: 'India',
                },
                items: [
                    {
                        productName: 'Rosewater Soothing Toner 200ml',
                        variantName: 'Default',
                        sku: 'ECL-TNR-01',
                        price: 349,
                        quantity: 1,
                        subtotal: 349,
                        image: '',
                    },
                ],
                subtotal: 349,
                discountAmount: 50,
                couponCode: 'SAVE50',
                shippingFee: 49,
                totalAmount: 348,
                paymentMethod: 'upi',
                paymentStatus: 'pending',
                orderStatus: 'pending',
                tracking: {
                    carrier: '',
                    trackingNumber: '',
                    trackingUrl: '',
                },
                notes: 'Awaiting order confirmation.',
            },
        ];

        await Order.insertMany(samples);
        console.log('[Seed] Sample orders created successfully');
    } catch (err) {
        console.error('[Seed] Error auto-seeding orders:', err.message);
    }
};

/**
 * List orders with search, status filters, and pagination
 */
export const list = async (req, res) => {
    try {
        await autoSeedIfEmpty();

        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 10, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim().toLowerCase();

        const query = {};

        // Status Filter
        if (status && status !== 'all') {
            if (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                query.orderStatus = status;
            } else if (['paid', 'failed', 'refunded'].includes(status)) {
                query.paymentStatus = status;
            }
        }

        // Search Filter
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { orderNumber: { $regex: escaped, $options: 'i' } },
                { 'customer.name': { $regex: escaped, $options: 'i' } },
                { 'customer.email': { $regex: escaped, $options: 'i' } },
                { 'customer.phone': { $regex: escaped, $options: 'i' } },
                { couponCode: { $regex: escaped, $options: 'i' } },
                { 'shippingAddress.city': { $regex: escaped, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [orders, total, countsByStatus] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query),
            Order.aggregate([
                {
                    $group: {
                        _id: '$orderStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        // Map status counts
        const statusCounts = {
            all: await Order.countDocuments(),
            pending: 0,
            confirmed: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
        };
        countsByStatus.forEach((item) => {
            if (item._id && statusCounts[item._id] !== undefined) {
                statusCounts[item._id] = item.count;
            }
        });

        return res.status(200).json({
            status: true,
            message: 'Orders retrieved successfully',
            data: {
                orders,
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
        console.error('Error listing orders:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Internal server error while fetching orders',
        });
    }
};

/**
 * Get order by ID
 */
export const getById = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing order ID',
            });
        }

        const order = await Order.findById(id).lean();
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Order details retrieved',
            data: { order },
        });
    } catch (error) {
        console.error('Error getting order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Internal server error',
        });
    }
};

/**
 * Create a new order manually
 */
export const create = async (req, res) => {
    try {
        const { error, value } = validateCreateOrder(req.body);
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
            });
        }

        // Calculate item subtotals and grand subtotal
        let calculatedSubtotal = 0;
        const processedItems = value.items.map((it) => {
            const itemSub = (it.price || 0) * (it.quantity || 1);
            calculatedSubtotal += itemSub;
            return {
                ...it,
                subtotal: itemSub,
            };
        });

        const subtotal = value.subtotal !== undefined ? Number(value.subtotal) : calculatedSubtotal;
        const discountAmount = Number(value.discountAmount || 0);
        const shippingFee = Number(value.shippingFee || 0);
        const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

        // Generate unique order number if not supplied
        let orderNumber = value.orderNumber;
        if (!orderNumber) {
            const count = await Order.countDocuments();
            orderNumber = `ORD-${1000 + count + 1}`;
        }

        // Check if orderNumber already exists
        const exists = await Order.findOne({ orderNumber });
        if (exists) {
            orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
        }

        const newOrder = new Order({
            ...value,
            orderNumber,
            items: processedItems,
            subtotal,
            discountAmount,
            shippingFee,
            totalAmount,
        });

        await newOrder.save();

        // Increment customer stats if customer exists
        try {
            await Customer.findOneAndUpdate(
                { email: value.customer.email.toLowerCase() },
                {
                    $inc: { ordersCount: 1, totalSpent: totalAmount },
                }
            );
        } catch (e) {
            // Ignore non-fatal customer update
        }

        return res.status(201).json({
            status: true,
            message: `Order ${orderNumber} created successfully`,
            data: { order: newOrder },
        });
    } catch (error) {
        console.error('Error creating order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to create order',
        });
    }
};

/**
 * Update order
 */
export const update = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id;
        const { error, value } = validateUpdateOrder({ ...req.body, id });
        if (error) {
            return res.status(400).json({
                status: false,
                message: error.details[0].message,
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        if (value.orderStatus) order.orderStatus = value.orderStatus;
        if (value.paymentStatus) order.paymentStatus = value.paymentStatus;
        if (value.paymentMethod) order.paymentMethod = value.paymentMethod;
        if (value.notes !== undefined) order.notes = value.notes;
        if (value.tracking) {
            order.tracking = {
                ...order.tracking,
                ...value.tracking,
            };
        }
        if (value.shippingAddress) {
            order.shippingAddress = {
                ...order.shippingAddress,
                ...value.shippingAddress,
            };
        }
        if (value.customer) {
            if (value.customer.name) order.customer.name = value.customer.name;
            if (value.customer.email) order.customer.email = value.customer.email;
            if (value.customer.phone !== undefined) order.customer.phone = value.customer.phone;
        }

        await order.save();

        return res.status(200).json({
            status: true,
            message: `Order ${order.orderNumber} updated successfully`,
            data: { order },
        });
    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to update order',
        });
    }
};

/**
 * Change order status or payment status
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

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        if (value.orderStatus) order.orderStatus = value.orderStatus;
        if (value.paymentStatus) order.paymentStatus = value.paymentStatus;

        await order.save();

        return res.status(200).json({
            status: true,
            message: `Order status updated to ${order.orderStatus}`,
            data: { order },
        });
    } catch (error) {
        console.error('Error changing order status:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to update status',
        });
    }
};

/**
 * Delete order
 */
export const deleteOrder = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing order ID',
            });
        }

        const order = await Order.findByIdAndDelete(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        return res.status(200).json({
            status: true,
            message: `Order ${order.orderNumber} deleted successfully`,
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to delete order',
        });
    }
};
