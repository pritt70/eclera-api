import mongoose from 'mongoose';

// Schema for individual social platform links (Instagram, Facebook, Threads, YouTube, etc.)
const socialLinkSchema = new mongoose.Schema(
    {
        platform: {
            type: String,
            required: [true, 'Platform identifier is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        title: {
            type: String,
            trim: true,
            default: '',
        },
        url: {
            type: String,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Schema for social media feed / reels / posts (video & image promotions)
const socialPostSchema = new mongoose.Schema(
    {
        mediaType: {
            type: String,
            enum: ['video', 'image'],
            default: 'video',
        },
        mediaUrl: {
            type: String,
            required: [true, 'Media URL is required'],
            trim: true,
        },
        thumbnailUrl: {
            type: String,
            trim: true,
            default: '',
        },
        caption: {
            type: String,
            trim: true,
            default: '',
        },
        platform: {
            type: String,
            trim: true,
            default: 'instagram',
        },
        link: {
            type: String,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export const SocialLink = mongoose.models.SocialLink || mongoose.model('SocialLink', socialLinkSchema);
export const SocialPost = mongoose.models.SocialPost || mongoose.model('SocialPost', socialPostSchema);

export default {
    SocialLink,
    SocialPost,
};
