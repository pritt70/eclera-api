import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        street: {
            type: String,
            trim: true,
            default: '',
        },
        city: {
            type: String,
            trim: true,
            default: '',
        },
        state: {
            type: String,
            trim: true,
            default: '',
        },
        postalCode: {
            type: String,
            trim: true,
            default: '',
        },
        country: {
            type: String,
            trim: true,
            default: 'India',
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { _id: true }
);

const customerSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
            default: '',
        },
        email: {
            type: String,
            required: [true, 'Email address is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        avatar: {
            url: { type: String, default: '', trim: true },
            key: { type: String, default: '', trim: true },
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'blocked'],
            default: 'active',
            trim: true,
        },
        ordersCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalSpent: {
            type: Number,
            default: 0,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
            default: '',
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
        addresses: [addressSchema],
    },
    {
        timestamps: true,
    }
);

// Search and performance indexes
customerSchema.index({ email: 1 }, { unique: true });
customerSchema.index({ phone: 1 });
customerSchema.index({ status: 1, createdAt: -1 });
customerSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
