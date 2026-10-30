import Maintenance from './model.js';

/**
 * Get maintenance configuration for admin panel
 * Fetches the exact document from the database
 */
export async function getMaintenance(req, res) {
    try {
        let config = await Maintenance.findOne({ key: 'site_maintenance' }).lean();
        if (!config) {
            config = await Maintenance.create({
                key: 'site_maintenance',
                isActive: false,
                title: '',
                description: '',
            });
        }
        return res.json({
            status: true,
            data: {
                isActive: Boolean(config.isActive),
                title: config.title || '',
                description: config.description || '',
            },
        });
    } catch (err) {
        console.error('Failed to get maintenance settings:', err);
        return res.status(500).json({
            status: false,
            message: err.message || 'Failed to fetch maintenance configuration from database',
        });
    }
}

/**
 * Update maintenance configuration from admin panel
 * Saves status, title, and description directly to the database
 */
export async function updateMaintenance(req, res) {
    try {
        const { isActive, title, description } = req.body;

        const updateData = {};
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (typeof title === 'string') updateData.title = title.trim();
        if (typeof description === 'string') updateData.description = description.trim();

        const config = await Maintenance.findOneAndUpdate(
            { key: 'site_maintenance' },
            { $set: updateData },
            { new: true, upsert: true }
        ).lean();

        return res.json({
            status: true,
            message: 'Maintenance settings saved to database successfully',
            data: {
                isActive: Boolean(config.isActive),
                title: config.title || '',
                description: config.description || '',
            },
        });
    } catch (err) {
        console.error('Failed to update maintenance settings:', err);
        return res.status(500).json({
            status: false,
            message: err.message || 'Failed to update maintenance configuration in database',
        });
    }
}

/**
 * Public endpoint for website to get maintenance state directly from database
 */
export async function getPublicMaintenance(req, res) {
    try {
        const config = await Maintenance.findOne({ key: 'site_maintenance' }).lean();
        return res.json({
            status: true,
            data: {
                isActive: Boolean(config?.isActive),
                title: config?.title || '',
                description: config?.description || '',
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            data: {
                isActive: false,
                title: '',
                description: '',
            },
        });
    }
}
