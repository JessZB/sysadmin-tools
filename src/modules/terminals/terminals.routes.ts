import { Router } from 'express';
import * as controller from './terminals.controller';

const router = Router();

router.get('/', controller.renderList);      // Vista
router.get('/data', controller.getListJson); // Data JSON
router.get('/currencies/:terminalId', controller.getCurrencyRates); // Currency Rates
router.get('/currencies/cache/stats', controller.getCacheStats); // Cache Stats
router.get('/currencies/cache/clear', controller.clearCache); // Clear All Cache
router.get('/currencies/cache/clear/:terminalId', controller.clearCache); // Clear Terminal Cache
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;