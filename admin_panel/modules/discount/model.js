import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, 'Coupon code is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
            required: true,
        },
        value: {
            type: Number,
            required: [true, 'Discount value is required'],
            min: [0, 'Discount value cannot be negative'],
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: [0, 'Minimum order value cannot be negative'],
        },
        maxDiscountAmount: {
            type: Number,
            default: 0,
            min: [0, 'Maximum discount amount cannot be negative'],
        },
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        usageLimit: {
            type: Number,
            default: 0,
            min: 0, // 0 = unlimited
        },
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        perCustomerLimit: {
            type: Number,
            default: 1,
            min: 1,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            trim: true,
        },
        isSpecial: {
            type: Boolean,
            default: false,
        },
        description: {
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
discountSchema.index({ code: 1 }, { unique: true });
discountSchema.index({ status: 1, createdAt: -1 });
discountSchema.index({ code: 'text', description: 'text' });

const Discount = mongoose.models.Discount || mongoose.model('Discount', discountSchema);

export default Discount;
