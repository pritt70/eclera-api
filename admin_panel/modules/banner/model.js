import mongoose from 'mongoose';

const bannerImageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            trim: true,
            default: '',
        },
        publicUrl: {
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
    { _id: false }
);

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: 'Banner',
        },
        subtitle: {
            type: String,
            trim: true,
            default: '',
        },
        image: {
            type: bannerImageSchema,
            required: [true, 'Banner image is required'],
        },
        mobileImage: {
            type: bannerImageSchema,
            default: () => ({ url: '', key: '' }),
        },
        link: {
            type: String,
            trim: true,
            default: '',
        },
        buttonText: {
            type: String,
            trim: true,
            default: 'Shop Now',
        },
        position: {
            type: String,
            enum: ['home_hero', 'home_middle', 'home_bottom', 'category_top', 'promo_popup', 'auth_popup', 'login_popup'],
            default: 'home_hero',
            trim: true,
        },
        category: {
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
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast querying
bannerSchema.index({ status: 1, position: 1, sortOrder: 1 });
bannerSchema.index({ title: 'text', subtitle: 'text' });

const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

export default Banner;
