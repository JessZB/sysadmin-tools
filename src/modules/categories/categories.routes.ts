import { Router } from 'express';
import * as categoriesController from './categories.controller';

const router = Router();

router.get('/', categoriesController.renderCategories);
router.post('/', categoriesController.create);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.remove);

router.post('/assign-module', categoriesController.assignModule);

export default router;
