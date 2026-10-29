import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: false,
        },
        productName: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
        },
        variantName: {
            type: String,
            trim: true,
            default: '',
        },
        sku: {
            type: String,
            trim: true,
            default: '',
        },
        price: {
            type: Number,
            required: [true, 'Item price is required'],
            min: [0, 'Price must be positive'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
        subtotal: {
            type: Number,
            required: true,
            default: 0,
        },
        image: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        street: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: '' },
        state: { type: String, trim: true, default: '' },
        postalCode: { type: String, trim: true, default: '' },
        country: { type: String, trim: true, default: 'India' },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: [true, 'Order number is required'],
            unique: true,
            trim: true,
            uppercase: true,
        },
        customer: {
            customerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Customer',
                required: false,
            },
            name: {
                type: String,
                required: [true, 'Customer name is required'],
                trim: true,
            },
            email: {
                type: String,
                required: [true, 'Customer email is required'],
                trim: true,
                lowercase: true,
            },
            phone: {
                type: String,
                trim: true,
                default: '',
            },
        },
        shippingAddress: shippingAddressSchema,
        items: [orderItemSchema],
        subtotal: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        discountAmount: {
            type: Number,
            min: 0,
            default: 0,
        },
        couponCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: '',
        },
        shippingFee: {
            type: Number,
            min: 0,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        paymentMethod: {
            type: String,
            enum: ['prepaid', 'advance', 'cod', 'online', 'card', 'upi', 'upi_qr', 'qr', 'netbanking'],
            default: 'upi_qr',
            trim: true,
        },
        paymentScreenshot: {
            type: String,
            trim: true,
            default: '',
        },
        utrNumber: {
            type: String,
            trim: true,
            default: '',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
            trim: true,
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
            trim: true,
        },
        tracking: {
            carrier: { type: String, trim: true, default: '' },
            trackingNumber: { type: String, trim: true, default: '' },
            trackingUrl: { type: String, trim: true, default: '' },
        },
        notes: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
