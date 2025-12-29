import { Request, Response } from 'express';
import * as branchService from './branches.service';

export const renderList = (req: Request, res: Response) => {
    res.render('branches/list', {
        page: 'branches',
        user: res.locals.user,
        script: 'branches.client.js'
    });
};

export const getData = async (req: Request, res: Response) => {
    try {
        const list = await branchService.getAllBranches();
        res.json(list);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const create = async (req: Request, res: Response) => {
    try {
        // Auditoría: req.user.id crea el registro
        await branchService.createBranch(req.body, res.locals.user.id);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

export const update = async (req: Request, res: Response) => {
    try {
        await branchService.updateBranch(Number(req.params.id), req.body, res.locals.user.id);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

export const remove = async (req: Request, res: Response) => {
    try {
        await branchService.deleteBranch(Number(req.params.id));
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};