import { Router } from 'express';
import * as screensController from './screens.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import { requireModule } from '../../shared/middlewares/permission.middleware';

const router = Router();

// Public
router.get('/viewer/:id', screensController.viewer);
router.post('/register-socket', screensController.registerSocket);

// Protected
router.use(requireAuth, requireModule('screens'));
router.get('/', screensController.index);
router.get('/:id', screensController.getScreenById);
router.post('/reload', screensController.reloadScreen);
router.post('/play', screensController.playVideo);
router.post('/create', screensController.createScreen);
router.put('/:id', screensController.updateScreen);
router.delete('/:id', screensController.deleteScreenById);

// Samsung TV Control
router.post('/control/power', screensController.controlPower);
router.post('/control/mute', screensController.controlMute);
router.post('/pair', screensController.pairDevice);
router.post('/startup', screensController.startupRoutine);
router.post('/validate', screensController.validateConnection);
router.post('/send-key', screensController.sendKey);
router.post('/open-browser', screensController.openBrowser);

export default router;
