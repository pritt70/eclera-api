import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: [true, 'Announcement text is required'],
            trim: true,
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
            trim: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

announcementSchema.index({ status: 1, sortOrder: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
