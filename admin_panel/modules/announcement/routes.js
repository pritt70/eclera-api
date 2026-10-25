import express from 'express';
import {
    listAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    changeAnnouncementStatus,
} from './controller.js';

const router = express.Router();

router.post('/list', listAnnouncements);
router.get('/list', listAnnouncements);

router.post('/add', createAnnouncement);
router.post('/create', createAnnouncement);

router.post('/update', updateAnnouncement);
router.put('/update', updateAnnouncement);

router.post('/delete', deleteAnnouncement);
router.delete('/delete', deleteAnnouncement);

router.post('/change-status', changeAnnouncementStatus);

export default router;
