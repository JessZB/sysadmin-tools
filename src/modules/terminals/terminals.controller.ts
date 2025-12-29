import { Request, Response } from 'express';
import * as terminalService from './terminals.service';
import { getAllBranches } from '../branches/branches.service';

// Vista HTML
export const renderList = async (req: Request, res: Response) => {
    try {
        const branches = await getAllBranches();
        res.render('terminals/list', {
            page: 'terminals',
            user: res.locals.user,
            branches: branches,
            script: 'terminals.client.js'
        });
    } catch (error) {
        res.status(500).send('Error cargando vista de terminales');
    }
};

// API JSON (Para Bootstrap Table)
export const getListJson = async (req: Request, res: Response) => {
    try {
        const list = await terminalService.getAllTerminals();
        res.json(list);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// Create
export const create = async (req: Request, res: Response) => {
    try {
        await terminalService.createTerminal(req.body, res.locals.user.id);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

// Update
export const update = async (req: Request, res: Response) => {
    try {
        const { forceBlankPassword } = req.body;
        await terminalService.updateTerminal(Number(req.params.id), req.body, res.locals.user.id, forceBlankPassword);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

// Delete
export const remove = async (req: Request, res: Response) => {
    try {
        await terminalService.deleteTerminal(Number(req.params.id));
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};