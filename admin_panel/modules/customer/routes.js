import express from 'express';
import { adminAuth } from '../../middleware/auth.js';
import {
    list,
    getById,
    create,
    update,
    changeStatus,
    deleteCustomer,
} from './controller.js';

const router = express.Router();

router.use(adminAuth);

// List
router.get('/', list);
router.post('/list', list);
router.get('/list', list);

// View / Get by ID
router.post('/view', getById);
router.get('/view/:id', getById);
router.get('/:id', getById);

// Create
router.post('/', create);
router.post('/create', create);

// Update
router.put('/:id', update);
router.post('/update/:id', update);
router.post('/update', update);

// Status change
router.patch('/:id/status', changeStatus);
router.post('/:id/change-status', changeStatus);
router.post('/change-status', changeStatus);

// Delete
router.delete('/:id', deleteCustomer);
router.post('/delete/:id', deleteCustomer);
router.post('/delete', deleteCustomer);

export default router;
