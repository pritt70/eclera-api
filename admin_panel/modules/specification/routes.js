import express from 'express';
import { adminAuth } from '../../middleware/auth.js';
import {
    list,
    getById,
    create,
    update,
    deleteSpecification,
    changeStatus,
    toggleStatus,
    reorder,
    addOption,
    updateOption,
    deleteOption,
} from './controller.js';

const router = express.Router();

// Protect all specification admin endpoints
router.use(adminAuth);

// Reorder routes (must precede /:id)
router.put('/reorder', reorder);
router.post('/reorder', reorder);

// List routes
router.get('/', list);
router.post('/list', list);

// Options management routes (direct action helpers)
router.post('/option/add', addOption);
router.post('/option/update', updateOption);
router.post('/option/delete', deleteOption);

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

// Options routes with path params
router.post('/:id/options', addOption);
router.put('/:id/options/:optionId', updateOption);
router.delete('/:id/options/:optionId', deleteOption);

// Delete routes
router.delete('/:id', deleteSpecification);
router.post('/delete/:id', deleteSpecification);
router.post('/delete', deleteSpecification);

export default router;
