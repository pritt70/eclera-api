import mongoose from 'mongoose';

const collectionSpecificationSchema = new mongoose.Schema(
    {
        specification: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Specification',
            required: true,
        },
        options: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'SpecificationOption',
            },
        ],
    },
    { _id: false }
);

const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Collection name is required'],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Collection slug is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        image: {
            url: {
                type: String,
                trim: true,
                default: '',
            },
            key: {
                type: String,
                trim: true,
                default: '',
            },
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        categories: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
            },
        ],
        specifications: [collectionSpecificationSchema],
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
        seoTitle: {
            type: String,
            trim: true,
            default: '',
        },
        seoDescription: {
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
collectionSchema.index({ name: 'text', description: 'text' });
collectionSchema.index({ status: 1, sortOrder: 1 });
collectionSchema.index({ category: 1 });
collectionSchema.index({ categories: 1 });
collectionSchema.index({ 'specifications.specification': 1 });

const Collection = mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

export default Collection;
