import express from 'express';
import {
    getSocialData,
    upsertSocialLink,
    deleteSocialLink,
    listSocialPosts,
    createSocialPost,
    updateSocialPost,
    deleteSocialPost,
} from './controller.js';

const router = express.Router();

// Social Links & combined overview
router.get('/', getSocialData);
router.get('/list', getSocialData);
router.post('/list', getSocialData);

router.post('/link', upsertSocialLink);
router.post('/link/set', upsertSocialLink);
router.post('/link/update', upsertSocialLink);
router.post('/link/delete', deleteSocialLink);
router.delete('/link/:platform', deleteSocialLink);

// Social Media Posts & Videos
router.get('/posts', listSocialPosts);
router.post('/posts', listSocialPosts);
router.post('/post/create', createSocialPost);
router.post('/post/update', updateSocialPost);
router.put('/post/update', updateSocialPost);
router.post('/post/delete', deleteSocialPost);
router.delete('/post/:id', deleteSocialPost);

export default router;
