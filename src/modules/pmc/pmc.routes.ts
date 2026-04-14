import { Router } from 'express';
import * as controller from './pmc.controller';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ─── VIEWS ────────────────────────────────────────────────────────
router.get('/', controller.renderDashboard);
router.get('/aisles/:id', controller.renderAisleDetail);
router.get('/import', controller.renderImport);

// ─── PRODUCTS (Cache-Aside Search) ───────────────────────────────
router.get('/api/products/search', controller.apiSearchProducts);
router.put('/api/products/:id/image',
    controller.uploadImage.single('image'),
    controller.apiUploadProductImage
);

// ─── AISLES ───────────────────────────────────────────────────────
router.get('/api/aisles', controller.apiGetAisles);
router.post('/api/aisles', controller.apiCreateAisle);
router.put('/api/aisles/reorder', controller.apiReorderAisles);
router.put('/api/aisles/:id', controller.apiUpdateAisle);
router.delete('/api/aisles/:id', controller.apiDeleteAisle);

// ─── AISLE PRODUCTS ───────────────────────────────────────────────
router.get('/api/aisles/:id/products', controller.apiGetAisleProducts);
router.post('/api/aisles/:id/products', controller.apiAddProductToAisle);
router.put('/api/aisles/:id/products/reorder', controller.apiReorderAisleProducts);
router.put('/api/aisles/:id/layout', controller.apiUpdateAisleLayout);
router.delete('/api/aisles/:id/products/:productId', controller.apiRemoveProductFromAisle);

// ─── EXCEL / PRICE UPDATES ────────────────────────────────────────
router.post('/api/excel/preview',
    controller.uploadExcel.single('file'),
    controller.apiExcelPreview
);
router.post('/api/excel/mapping', controller.apiSaveExcelMapping);
router.post('/api/excel/process',
    controller.uploadExcel.single('file'),
    controller.apiProcessExcel
);
router.get('/api/price-updates', controller.apiGetPriceUpdates);

export default router;
