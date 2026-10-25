import Announcement from './model.js';

// 1. List Announcements (Admin)
export const listAnnouncements = async (req, res) => {
    try {
        const { search = '' } = req.body || {};
        const query = {};

        if (search && search.trim() !== '') {
            query.text = { $regex: search.trim(), $options: 'i' };
        }

        const announcements = await Announcement.find(query)
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        return res.json({
            status: true,
            data: {
                announcements,
                pagination: {
                    total: announcements.length,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// 2. Create Announcement (Admin)
export const createAnnouncement = async (req, res) => {
    try {
        const { text, link = '' } = req.body || {};

        if (!text || text.trim() === '') {
            return res.status(400).json({ status: false, message: 'Announcement message is required' });
        }

        const count = await Announcement.countDocuments();
        const announcement = await Announcement.create({
            text: text.trim(),
            link: (link || '').trim(),
            sortOrder: count + 1,
            status: 'active',
        });

        return res.json({
            status: true,
            message: 'Announcement added successfully',
            data: announcement,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// 3. Update Announcement (Admin)
export const updateAnnouncement = async (req, res) => {
    try {
        const { id, _id, text, link = '' } = req.body || {};
        const targetId = id || _id;

        if (!targetId) {
            return res.status(400).json({ status: false, message: 'Announcement ID is required' });
        }

        if (!text || text.trim() === '') {
            return res.status(400).json({ status: false, message: 'Announcement message is required' });
        }

        const announcement = await Announcement.findByIdAndUpdate(
            targetId,
            { text: text.trim(), link: (link || '').trim() },
            { new: true }
        );

        if (!announcement) {
            return res.status(404).json({ status: false, message: 'Announcement not found' });
        }

        return res.json({
            status: true,
            message: 'Announcement updated successfully',
            data: announcement,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// 4. Delete Announcement (Admin)
export const deleteAnnouncement = async (req, res) => {
    try {
        const { id, _id } = req.body || {};
        const targetId = id || _id;

        if (!targetId) {
            return res.status(400).json({ status: false, message: 'Announcement ID is required' });
        }

        const deleted = await Announcement.findByIdAndDelete(targetId);
        if (!deleted) {
            return res.status(404).json({ status: false, message: 'Announcement not found' });
        }

        return res.json({
            status: true,
            message: 'Announcement deleted successfully',
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// 5. Change Status (Compatibility)
export const changeAnnouncementStatus = async (req, res) => {
    try {
        const { id, _id, status } = req.body || {};
        const targetId = id || _id;

        const announcement = await Announcement.findByIdAndUpdate(
            targetId,
            { status: status || 'active' },
            { new: true }
        );

        return res.json({
            status: true,
            message: 'Status updated',
            data: announcement,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// 6. Public Announcements for Website
export const getPublicAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({ status: { $ne: 'inactive' } })
            .select('text link')
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        return res.json({
            status: true,
            data: announcements,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
