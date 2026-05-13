import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    listKoalInvoices,
    getKoalInvoiceById,
    createKoalInvoice,
    updateKoalInvoice,
    deleteKoalInvoice,
    getNextKoalInvoiceNumber,
    markKoalInvoicePaidWithUtr,
} from '../../../services/v1/admin/koal-invoice.service';
import { isKoalInvoiceStatus } from '../../../constants/koal-invoice';
import { generateKoalInvoicePdf } from '../../../services/v1/admin/koal-invoice-pdf.service';

export const listKoalInvoicesController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const status =
            typeof req.query.status === 'string' && isKoalInvoiceStatus(req.query.status)
                ? req.query.status
                : undefined;
        const result = await listKoalInvoices({ page, limit, search, status });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin list koal invoices error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

function firstQueryValue(value: unknown): unknown {
    if (Array.isArray(value)) return value[0];
    return value;
}

export const getNextKoalInvoiceNumberController = async (req: Request, res: Response) => {
    try {
        const yearRaw = firstQueryValue(req.query.year);
        const result = await getNextKoalInvoiceNumber(yearRaw === undefined ? {} : { year: yearRaw });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin next koal invoice number error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

export const getKoalInvoiceByIdController = async (req: Request, res: Response) => {
    try {
        const invoice = await getKoalInvoiceById(req.params.id);
        return res.status(HttpStatus.OK).json(invoice);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin get koal invoice error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

export const createKoalInvoiceController = async (req: Request, res: Response) => {
    try {
        const invoice = await createKoalInvoice(req.body || {});
        return res.status(HttpStatus.CREATED).json(invoice);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin create koal invoice error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

export const updateKoalInvoiceController = async (req: Request, res: Response) => {
    try {
        const invoice = await updateKoalInvoice(req.params.id, req.body || {});
        return res.status(HttpStatus.OK).json(invoice);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin update koal invoice error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** POST /admin/koal-invoices/:id/mark-paid — body `{ "payment_utr": "..." }` sets status to paid. */
export const markKoalInvoicePaidController = async (req: Request, res: Response) => {
    try {
        const invoice = await markKoalInvoicePaidWithUtr(req.params.id, req.body || {});
        return res.status(HttpStatus.OK).json(invoice);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin mark koal invoice paid error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

export const deleteKoalInvoiceController = async (req: Request, res: Response) => {
    try {
        await deleteKoalInvoice(req.params.id);
        return res.status(HttpStatus.OK).json({ message: 'Invoice deleted' });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin delete koal invoice error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** GET /admin/koal-invoices/:id/pdf */
export const getKoalInvoicePdfController = async (req: Request, res: Response) => {
    try {
        const { buffer, filename } = await generateKoalInvoicePdf(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin koal invoice PDF error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};
