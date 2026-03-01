import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getProposalCart, submitProposal } from '../../../services/v1/web/proposal.service';

/**
 * GET /web/proposal/:token - get cart data for proposal page. Token from URL (e.g. /proposals/{token}).
 * Validates proposal link (exists, not yet used); returns full cart with client and items.
 */
export const getProposalByTokenController = async (req: Request, res: Response) => {
    try {
        const token = req.params.token;
        if (!token?.trim()) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Token is required' });
        }
        const result = await getProposalCart(token.trim());
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Web get proposal error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/**
 * POST /web/proposal/:token/submit - submit proposal confirmation with billing info. Marks link as used.
 */
export const submitProposalController = async (req: Request, res: Response) => {
    try {
        const token = req.params.token;
        if (!token?.trim()) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Token is required' });
        }
        const body = req.body || {};
        const items = Array.isArray(body.items)
            ? body.items.map((it: any) => ({ id: String(it?.id ?? '').trim(), accepted: !!it?.accepted }))
            : [];
        const result = await submitProposal(token.trim(), {
            items,
            registeredCompanyName: body.registeredCompanyName ?? '',
            registeredCompanyAddress: body.registeredCompanyAddress ?? '',
            authorizedSignatoryName: body.authorizedSignatoryName ?? '',
            authorizedSignatoryDesignation: body.authorizedSignatoryDesignation ?? '',
            officialEmailId: body.officialEmailId ?? '',
            phoneNumber: body.phoneNumber ?? '',
            preferredPaymentMode: body.preferredPaymentMode === 'crypto' ? 'crypto' : 'bank_transfer',
            docusignProofLink: body.docusignProofLink ?? null,
            isTermsConfirmed: !!body.isTermsConfirmed,
        });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Web submit proposal error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
