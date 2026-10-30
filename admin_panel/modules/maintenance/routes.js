import express from 'express';
import { getMaintenance, updateMaintenance } from './controller.js';
import { adminAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', adminAuth, getMaintenance);
router.post('/get', adminAuth, getMaintenance);
router.post('/update', adminAuth, updateMaintenance);
router.put('/update', adminAuth, updateMaintenance);
router.post('/', adminAuth, updateMaintenance);

export default router;
