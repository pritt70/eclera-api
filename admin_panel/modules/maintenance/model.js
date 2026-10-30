import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: 'site_maintenance',
            unique: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: '',
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Maintenance || mongoose.model('Maintenance', maintenanceSchema);
