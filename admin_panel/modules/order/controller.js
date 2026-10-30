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
 * List orders with search, status filters, and pagination
 */
export const list = async (req, res) => {
    try {

        const page = Math.max(1, parseInt(req.body?.page || req.query?.page || 1, 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.body?.limit || req.query?.limit || 10, 10)));
        const search = (req.body?.search || req.query?.search || '').trim();
        const status = (req.body?.status || req.query?.status || '').trim().toLowerCase();

        const query = {};

        // Archive vs Active orders filter
        if (status === 'archived') {
            query.isArchived = true;
        } else {
            query.isArchived = { $ne: true };
            if (status && status !== 'all') {
                if (['pending', 'confirmed', 'shipped', 'delivered', 'returned'].includes(status)) {
                    query.orderStatus = status;
                } else if (['paid', 'failed', 'refunded'].includes(status)) {
                    query.paymentStatus = status;
                }
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

        const [
            orders,
            total,
            allActiveCount,
            pendingCount,
            confirmedCount,
            shippedCount,
            deliveredCount,
            returnedCount,
            archivedCount,
        ] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query),
            Order.countDocuments({ isArchived: { $ne: true } }),
            Order.countDocuments({ isArchived: { $ne: true }, orderStatus: 'pending' }),
            Order.countDocuments({ isArchived: { $ne: true }, orderStatus: 'confirmed' }),
            Order.countDocuments({ isArchived: { $ne: true }, orderStatus: 'shipped' }),
            Order.countDocuments({ isArchived: { $ne: true }, orderStatus: 'delivered' }),
            Order.countDocuments({ isArchived: { $ne: true }, orderStatus: 'returned' }),
            Order.countDocuments({ isArchived: true }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const statusCounts = {
            all: allActiveCount,
            pending: pendingCount,
            confirmed: confirmedCount,
            shipped: shippedCount,
            delivered: deliveredCount,
            returned: returnedCount,
            archived: archivedCount,
        };

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

        if (value.orderStatus) {
            order.orderStatus = value.orderStatus;
            if (value.orderStatus === 'returned') {
                order.returnApprovedAt = new Date();
                order.returnReason = value.returnReason || order.returnReason || 'Approved via Admin call / verification';
            }
        }
        if (value.paymentStatus) order.paymentStatus = value.paymentStatus;
        if (value.returnReason) order.returnReason = value.returnReason;

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
 * Archive order
 */
export const archive = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing order ID',
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        order.isArchived = true;
        order.archivedAt = new Date();
        await order.save();

        return res.status(200).json({
            status: true,
            message: `Order #${order.orderNumber} has been archived`,
            data: { order },
        });
    } catch (error) {
        console.error('Error archiving order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to archive order',
        });
    }
};

/**
 * Unarchive / Restore order
 */
export const unarchive = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid or missing order ID',
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        order.isArchived = false;
        order.archivedAt = null;
        await order.save();

        return res.status(200).json({
            status: true,
            message: `Order #${order.orderNumber} restored from archive`,
            data: { order },
        });
    } catch (error) {
        console.error('Error unarchiving order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to restore order',
        });
    }
};

/**
 * Delete order - Only archived orders can be permanently deleted
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

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: 'Order not found',
            });
        }

        // Enforce user rule: Orders cannot be deleted directly, only from archive!
        if (!order.isArchived) {
            return res.status(400).json({
                status: false,
                message: 'Active orders cannot be deleted directly. Please archive the order first to delete it.',
            });
        }

        await Order.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: `Archived order #${order.orderNumber} permanently deleted`,
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to delete order',
        });
    }
};
