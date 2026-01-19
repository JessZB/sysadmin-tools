import { Request, Response } from 'express';
import * as terminalService from './terminals.service';
import * as currencyService from './currency.service';
import { getAllBranches } from '../branches/branches.service';
import * as auditService from '../audit/audit.service';

// Vista HTML
export const renderList = async (req: Request, res: Response) => {
    try {
        const branches = await getAllBranches() || [];
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
        const currentUser = res.locals.user;
        const { name } = req.body;

        await terminalService.createTerminal(req.body, currentUser.id);

        // Auditoría
        auditService.logAction(
            currentUser.id,
            currentUser.branch_id,
            'CREATE',
            'TERMINAL',
            null,
            `Terminal creada: ${name}`,
            req.ip
        );

        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

// Update
export const update = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const { forceBlankPassword, name } = req.body;
        const terminalId = Number(req.params.id);

        await terminalService.updateTerminal(terminalId, req.body, currentUser.id, forceBlankPassword);

        // Auditoría
        auditService.logAction(
            currentUser.id,
            currentUser.branch_id,
            'UPDATE',
            'TERMINAL',
            terminalId,
            `Terminal actualizada: ${name}`,
            req.ip
        );

        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

// Delete
export const remove = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const terminalId = Number(req.params.id);

        await terminalService.deleteTerminal(terminalId);

        // Auditoría
        auditService.logAction(
            currentUser.id,
            currentUser.branch_id,
            'DELETE',
            'TERMINAL',
            terminalId,
            `Terminal eliminada ID: ${terminalId}`,
            req.ip
        );

        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
};

// Get Currency Rates
export const getCurrencyRates = async (req: Request, res: Response) => {
    try {
        const terminalId = Number(req.params.terminalId);

        // Obtener información de la terminal
        const terminals = await terminalService.getAllTerminals();
        const terminal = terminals.find(t => t.id === terminalId);

        if (!terminal) {
            return res.status(404).json({ error: 'Terminal no encontrada' });
        }

        // Obtener tasas de cambio según el tipo de terminal
        const currencies = await currencyService.getCurrencyRates(terminal);

        res.json(currencies);
    } catch (e: any) {
        console.error('Error fetching currency rates:', e);
        res.status(500).json({ error: 'No se pudieron obtener las tasas de cambio' });
    }
};

// Clear Currency Cache
export const clearCache = async (req: Request, res: Response) => {
    try {
        const terminalId = req.params.terminalId ? Number(req.params.terminalId) : undefined;
        currencyService.clearCurrencyCache(terminalId);

        res.json({
            success: true,
            message: terminalId
                ? `Caché limpiado para terminal ${terminalId}`
                : 'Caché completamente limpiado'
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

// Get Cache Statistics
export const getCacheStats = async (req: Request, res: Response) => {
    try {
        const stats = currencyService.getCacheStats();
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};