import { Request, Response } from 'express';

export const showBarcodeGenerator = (req: Request, res: Response) => {
    res.render('barcode/generator', { page: 'barcode', user: res.locals.user });
};
