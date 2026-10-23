import mongoose from 'mongoose';

const policySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Policy title is required'],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Policy slug is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['shipping', 'return', 'terms', 'privacy', 'custom'],
            default: 'custom',
            trim: true,
        },
        summary: {
            type: String,
            trim: true,
            default: '',
        },
        content: {
            type: String,
            required: [true, 'Policy content is required'],
            default: '',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            trim: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        updatedBy: {
            type: String,
            default: 'Admin',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast querying
policySchema.index({ slug: 1 });
policySchema.index({ status: 1, type: 1 });
policySchema.index({ title: 'text', summary: 'text' });

const Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema);

export default Policy;
