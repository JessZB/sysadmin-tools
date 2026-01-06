import { Router } from 'express';
import * as controller from './services.controller';

const router = Router();

// Vista principal
router.get('/', controller.renderList);

// API endpoints
router.get('/data', controller.getListJson);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

// Ping endpoints
router.post('/ping/:id', controller.pingSingle);
router.post('/ping-batch', controller.pingBatch);

// Historial
router.get('/history/:id', controller.getHistory);

export default router;
