import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
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
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
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

const abandonedCartSchema = new mongoose.Schema(
    {
        cartNumber: {
            type: String,
            required: [true, 'Cart identifier is required'],
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
                required: false,
                default: '',
                trim: true,
                lowercase: true,
            },
            phone: {
                type: String,
                trim: true,
                default: '',
            },
        },
        items: [cartItemSchema],
        cartTotal: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        recoveryStatus: {
            type: String,
            enum: ['abandoned', 'email_sent', 'recovered', 'expired'],
            default: 'abandoned',
            trim: true,
        },
        emailSentCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastEmailSentAt: {
            type: Date,
            default: null,
        },
        recoveredAt: {
            type: Date,
            default: null,
        },
        lastActivityAt: {
            type: Date,
            default: Date.now,
        },
        checkoutStep: {
            type: String,
            enum: ['cart', 'contact_info', 'shipping_address', 'payment_pending'],
            default: 'cart',
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
abandonedCartSchema.index({ cartNumber: 1 }, { unique: true });
abandonedCartSchema.index({ 'customer.email': 1 });
abandonedCartSchema.index({ recoveryStatus: 1 });
abandonedCartSchema.index({ createdAt: -1 });

const AbandonedCart = mongoose.models.AbandonedCart || mongoose.model('AbandonedCart', abandonedCartSchema);

export default AbandonedCart;
