import express from 'express';
import { adminAuth } from '../../middleware/auth.js';
import { presign, directUpload, deleteUpload } from './controller.js';

const router = express.Router();

// Direct upload: streams image file buffer directly through backend to R2 (bypasses browser CORS completely)
router.post(
    '/direct',
    adminAuth,
    express.raw({ type: ['image/*', 'video/*', 'application/octet-stream'], limit: '50mb' }),
    directUpload
);

// Protect all upload endpoints with admin authentication
router.use(adminAuth);

// Presigned URL generation
router.post('/presign', presign);

// Object deletion
router.delete('/', deleteUpload);
router.post('/delete', deleteUpload);

export default router;
