import { Router } from 'express';
import * as controller from './branches.controller';

const router = Router();

router.get('/', controller.renderList);
router.get('/data', controller.getData);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;