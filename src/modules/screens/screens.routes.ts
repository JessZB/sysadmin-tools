import { Router } from 'express';
import * as screensController from './screens.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import { requireModule } from '../../shared/middlewares/permission.middleware';

const router = Router();

// Public routes (no auth required)
router.get('/viewer/:id', screensController.viewer);
router.post('/register-socket', screensController.registerSocket);

// Protected routes (require authentication)
router.use(requireAuth, requireModule('screens'));

// Screen management
router.get('/', screensController.index);
router.get('/:id', screensController.getScreenById);
router.post('/reload', screensController.reloadScreen);
router.post('/play', screensController.playVideo);
router.post('/create', screensController.createScreen);
router.put('/:id', screensController.updateScreen);
router.delete('/:id', screensController.deleteScreenById);

// Samsung TV control
router.post('/control/power', screensController.controlPower);
router.post('/control/mute', screensController.controlMute);
router.post('/pair', screensController.pairDevice);
router.post('/startup', screensController.startupRoutine);
router.post('/validate', screensController.validateConnection);
router.post('/send-key', screensController.sendKey);
router.post('/open-browser', screensController.openBrowser);

// LG TV control
router.post('/lg/validate', screensController.validateLGConnection);
router.post('/lg/open-browser', screensController.openLGBrowser);
router.post('/lg/cast', screensController.castLGContent);
router.post('/lg/power-off', screensController.turnOffLG);
router.post('/lg/wake', screensController.wakeLG);
router.post('/lg/toast', screensController.sendLGToast);
router.get('/lg/system-info', screensController.getLGSystemInfo);
router.post('/lg/startup', screensController.startupRoutineLG);

export default router;
