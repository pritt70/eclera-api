import express from 'express';
import { adminAuth } from '../../middleware/auth.js';
import {
    list,
    getById,
    create,
    update,
    changeStatus,
    deleteOrder,
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

// Update
router.post('/update', update);
router.put('/update/:id', update);
router.put('/:id', update);

// Status
router.post('/change-status', changeStatus);
router.patch('/change-status', changeStatus);

// Delete
router.post('/delete', deleteOrder);
router.delete('/delete/:id', deleteOrder);
router.delete('/:id', deleteOrder);

export default router;
