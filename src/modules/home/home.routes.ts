import { Router } from 'express';
import * as controller from './home.controller';
import { updateUserModules } from '../../shared/middlewares/update-modules.middleware';

const router = Router();

router.get('/', updateUserModules, controller.renderHome);

export default router;
