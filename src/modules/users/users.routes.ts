import { Router } from 'express';
import * as userController from './users.controller';
// Asumimos que ya tienes el middleware requireAuth importado en app.ts o aquí
// Si quieres proteger a nivel de ruta:
// import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /users -> Muestra la vista
router.get('/', userController.renderUserList);

// Endpoints AJAX (JSON)
router.post('/', userController.create);
router.get('/data', userController.getUsersData);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

router.put('/:id/modules', userController.updateModules);

export default router;