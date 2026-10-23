import express from 'express';
import { adminAuth } from '../../middleware/auth.js';
import {
    list,
    getById,
    create,
    sendRecovery,
    changeStatus,
    deleteCart,
} from './controller.js';

const router = express.Router();

router.use(adminAuth);

// List
router.get('/', list);
router.post('/list', list);
router.get('/list', list);

// View / Get by ID
router.post('/view', getById);
router.post('/get-by-id', getById);
router.get('/view/:id', getById);
router.get('/:id', getById);

// Create
router.post('/', create);
router.post('/create', create);

// Send recovery action
router.post('/send-recovery', sendRecovery);

// Status
router.post('/change-status', changeStatus);
router.patch('/change-status', changeStatus);

// Delete
router.post('/delete', deleteCart);
router.delete('/delete/:id', deleteCart);
router.delete('/:id', deleteCart);

export default router;
