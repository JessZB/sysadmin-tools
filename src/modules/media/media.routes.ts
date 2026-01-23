import { Router } from 'express';
import * as mediaController from './media.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();

// All media routes require authentication
router.use(requireAuth);

// Upload video
router.post('/upload', mediaController.uploadMiddleware, mediaController.uploadVideo);

// List videos
router.get('/list', mediaController.listVideos);

// Delete video
router.delete('/:filename', mediaController.deleteVideo);

// Create folder
router.post('/folder', mediaController.createFolder);

// Get player URL
router.post('/player-url', mediaController.getPlayerUrl);

export default router;
