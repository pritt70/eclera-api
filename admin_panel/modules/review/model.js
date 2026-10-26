import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product reference is required'],
            index: true,
        },
        productSlug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Customer name is required'],
            trim: true,
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            default: 'India',
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        message: {
            type: String,
            required: [true, 'Review message is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'hidden'],
            default: 'active',
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

reviewSchema.index({ productSlug: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
