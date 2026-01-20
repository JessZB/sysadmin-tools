import { Router } from 'express';
import * as screensController from './screens.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import { requireModule } from '../../shared/middlewares/permission.middleware';

const router = Router();

// Public
router.get('/viewer/:id', screensController.viewer);

// Protected
router.use(requireAuth, requireModule('screens'));
router.get('/', screensController.index);
router.post('/reload', screensController.reloadScreen);
router.post('/play', screensController.playVideo);
router.post('/create', screensController.createScreen);

export default router;
