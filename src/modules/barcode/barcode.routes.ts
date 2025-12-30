import { Router } from 'express';
import * as barcodeController from './barcode.controller';

const router = Router();

router.get('/', barcodeController.showBarcodeGenerator);

export default router;
