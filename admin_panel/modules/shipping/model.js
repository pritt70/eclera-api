import mongoose from 'mongoose';

const shippingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Shipping zone title is required'],
            trim: true,
        },
        country: {
            type: String,
            default: 'India',
            trim: true,
        },
        state: {
            type: String,
            default: 'All States',
            trim: true,
        },
        city: {
            type: String,
            default: 'All Cities',
            trim: true,
        },
        postalCodes: {
            type: [String],
            default: [],
        },
        type: {
            type: String,
            enum: ['free', 'paid'],
            default: 'free',
        },
        rate: {
            type: Number,
            default: 0,
            min: [0, 'Shipping rate cannot be negative'],
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: [0, 'Minimum order value cannot be negative'],
        },
        estimatedDays: {
            type: String,
            default: '3-5 Business Days',
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            index: true,
        },
        notes: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

shippingSchema.index({ country: 1, state: 1, city: 1 });

const Shipping = mongoose.model('Shipping', shippingSchema);
export default Shipping;
