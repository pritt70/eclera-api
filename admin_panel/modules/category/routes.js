import express from 'express';
import { adminAuth } from '../../middleware/auth.js';
import {
    list,
    getById,
    create,
    update,
    deleteCategory,
    changeStatus,
    toggleStatus,
    reorder,
} from './controller.js';

const router = express.Router();

// Protect all category admin endpoints
router.use(adminAuth);

// Reorder routes (must precede /:id)
router.put('/reorder', reorder);
router.post('/reorder', reorder);

// List routes
router.get('/', list);
router.post('/list', list);

// View routes
router.post('/view', getById);
router.get('/view/:id', getById);
router.post('/detail', getById);
router.get('/:id', getById);

// Create routes
router.post('/', create);
router.post('/create', create);

// Update routes
router.put('/:id', update);
router.post('/update/:id', update);
router.post('/update', update);

// Status change routes
router.patch('/:id/status', changeStatus);
router.post('/:id/change-status', changeStatus);
router.post('/change-status', changeStatus);

// Delete routes
router.delete('/:id', deleteCategory);
router.post('/delete/:id', deleteCategory);
router.post('/delete', deleteCategory);

export default router;
