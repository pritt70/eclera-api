import mongoose from 'mongoose';

const categorySpecificationSchema = new mongoose.Schema(
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

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Category slug is required'],
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
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
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
        specifications: [categorySpecificationSchema],
    },
    {
        timestamps: true,
    }
);

// Indexes for query performance and uniqueness
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ status: 1, sortOrder: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ 'specifications.specification': 1 });
categorySchema.index({ 'specifications.options': 1 });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
