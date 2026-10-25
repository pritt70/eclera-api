import mongoose from 'mongoose';

const productSpecificationSchema = new mongoose.Schema(
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

const productGroupSchema = new mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: false,
        },
        groupId: {
            type: String,
            trim: true,
            default: '',
        },
        groupTitle: {
            type: String,
            trim: true,
            default: 'Available Options',
        },
        attributeName: {
            type: String,
            trim: true,
            default: 'Color',
        },
        attributeValue: {
            type: String,
            trim: true,
            default: '',
        },
        swatchColor: {
            type: String,
            trim: true,
            default: '',
        },
        swatchImage: {
            url: { type: String, trim: true, default: '' },
            publicUrl: { type: String, trim: true, default: '' },
            key: { type: String, trim: true, default: '' },
        },
        linkedProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Product slug is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        sku: {
            type: String,
            trim: true,
            default: '',
        },
        barcode: {
            type: String,
            trim: true,
            default: '',
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Product category is required'],
        },
        collections: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Collection',
            },
        ],
        description: {
            type: String,
            trim: true,
            default: '',
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price must be positive'],
            default: 0,
        },
        comparePrice: {
            type: Number,
            min: [0, 'Compare price must be positive'],
            default: 0,
        },
        costPrice: {
            type: Number,
            min: [0, 'Cost price must be positive'],
            default: 0,
        },
        stock: {
            type: Number,
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        trackStock: {
            type: Boolean,
            default: true,
        },
        images: [
            {
                url: { type: String, trim: true, default: '' },
                publicUrl: { type: String, trim: true, default: '' },
                key: { type: String, trim: true, default: '' },
            },
        ],
        specifications: [productSpecificationSchema],
        relatedProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
        group: {
            type: productGroupSchema,
            default: () => ({}),
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
    },
    {
        timestamps: true,
    }
);

// Search and performance indexes
productSchema.index({ name: 'text', description: 'text', sku: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ collections: 1 });
productSchema.index({ status: 1, sortOrder: 1 });
productSchema.index({ 'group.groupId': 1 });
productSchema.index({ 'group.enabled': 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
