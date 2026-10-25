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
        fullName: {
            type: String,
            trim: true,
            default: '',
        },
        firstName: {
            type: String,
            trim: true,
            default: '',
        },
        lastName: {
            type: String,
            trim: true,
            default: '',
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        password: {
            type: String,
            default: '',
        },
        country: {
            type: String,
            trim: true,
            default: 'India',
        },
        state: {
            type: String,
            trim: true,
            default: '',
        },
        city: {
            type: String,
            trim: true,
            default: '',
        },
        postalCode: {
            type: String,
            trim: true,
            default: '',
        },
        deliveryAddress: {
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
customerSchema.index(
    { email: 1 },
    { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }
);
customerSchema.index(
    { phone: 1 },
    { unique: true, partialFilterExpression: { phone: { $type: 'string', $gt: '' } } }
);
customerSchema.index({ status: 1, createdAt: -1 });
customerSchema.index({ firstName: 'text', lastName: 'text', fullName: 'text', email: 'text', phone: 'text' });

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
