import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { ENV } from '../../../config/env';
import crypto from 'crypto';
import { instagramConfig } from '../../../config/instagram';
import {
    buildInstagramOAuthUrl,
    consumeInstagramState,
    connectInstagramAccount,
    parseSignedRequest,
    disconnectInstagramAccountByUserId,
    deleteInstagramAccountByUserId,
} from '../../../services/v1/web/instagram-auth.service';

/**
 * Tiny HTML page returned from the OAuth callback. It posts the result back to the
 * opener window (the frontend that launched the popup) and closes itself. Payload is
 * JSON-serialized into a postMessage scoped to FRONTEND_ORIGIN.
 */
function closePopup(payload: Record<string, unknown>): string {
    // Stable marker so the opener can distinguish our messages from other postMessages.
    const data = JSON.stringify({ source: 'ampli5-instagram', ...payload });
    const origin = JSON.stringify(ENV.FRONTEND_ORIGIN || '*');
    return `<!doctype html><html><body>Connecting…<script>
    (function () {
      try { window.opener && window.opener.postMessage(${data}, ${origin}); } catch (e) {}
      window.close();
    })();
    </script></body></html>`;
}

/**
 * GET /web/instagram/oauth-url
 * Returns the Instagram authorize URL for the frontend to open in a popup.
 */
export const getInstagramOAuthUrlController = async (_req: Request, res: Response) => {
    try {
        const { url, state } = buildInstagramOAuthUrl();
        return res.status(HttpStatus.OK).json({ success: true, url, state });
    } catch (error) {
        const e = error as { status?: number; message?: string };
        const status = e.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`IG oauth-url error (${status}): ${e.message}`);
        return res.status(status).json({ success: false, message: 'Could not start Instagram login.' });
    }
};

/**
 * GET /web/instagram/callback
 * Instagram redirects here with ?code & ?state (or ?error). Responds with the
 * popup-close HTML carrying the connection summary or an error.
 */
export const instagramCallbackController = async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query as Record<string, string | undefined>;

    // User denied/closed the Instagram consent screen. Raw technical text stays in logs;
    // the client gets a stable reason + friendly message.
    if (error) {
        logger.warn(`IG callback returned error: ${error} - ${error_description || ''}`);
        const cancelled = error === 'access_denied';
        return res.send(
            closePopup({
                success: false,
                reason: cancelled ? 'cancelled' : 'denied',
                error: cancelled
                    ? 'Instagram login was cancelled.'
                    : 'Instagram did not grant access. Please try again and approve the requested permissions.',
            })
        );
    }

    try {
        consumeInstagramState(state);
        const { summary } = await connectInstagramAccount(String(code || ''));
        return res.send(closePopup({ success: true, instagram: summary }));
    } catch (err) {
        // Log the real cause server-side only; never leak server/status codes to the client.
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`IG callback error: ${message}`);
        return res.send(
            closePopup({
                success: false,
                reason: 'failed',
                error: 'We couldn’t connect your Instagram account. Please make sure it is a Business or Creator account and try again.',
            })
        );
    }
};

/**
 * POST /web/instagram/disconnect
 * In-app "Disconnect" button. Body: { igUserId }. Soft-deletes the account + clears
 * the stored token. No auth (onboarding runs pre-login); idempotent.
 */
export const disconnectInstagramController = async (req: Request, res: Response) => {
    try {
        const igUserId = (req.body?.igUserId as string | undefined)?.trim();
        if (!igUserId) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'igUserId is required' });
        }
        await disconnectInstagramAccountByUserId(igUserId);
        return res.status(HttpStatus.OK).json({ success: true });
    } catch (err) {
        logger.error(`IG disconnect error: ${err instanceof Error ? err.message : String(err)}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Could not disconnect.' });
    }
};

/**
 * POST /web/instagram/deauthorize
 * Meta calls this (signed_request) when a user removes the app from Instagram.
 * We verify the signature, then soft-delete + clear the token. Always 200.
 */
export const instagramDeauthorizeController = async (req: Request, res: Response) => {
    try {
        const payload = parseSignedRequest(req.body?.signed_request as string | undefined);
        if (payload?.user_id) {
            await disconnectInstagramAccountByUserId(payload.user_id);
        } else {
            logger.warn('IG deauthorize: invalid or missing signed_request');
        }
    } catch (err) {
        logger.error(`IG deauthorize error: ${err instanceof Error ? err.message : String(err)}`);
    }
    // Meta expects a 200 regardless.
    return res.status(HttpStatus.OK).json({ success: true });
};

/**
 * POST /web/instagram/data-deletion
 * Meta data-deletion request (signed_request). We delete the user's data and return
 * a status-check URL + confirmation code, per Meta's required response shape.
 */
export const instagramDataDeletionController = async (req: Request, res: Response) => {
    try {
        const payload = parseSignedRequest(req.body?.signed_request as string | undefined);
        if (payload?.user_id) {
            await deleteInstagramAccountByUserId(payload.user_id);
        } else {
            logger.warn('IG data-deletion: invalid or missing signed_request');
        }
        // Confirmation code derived from the user id (stable, non-sensitive) for status lookups.
        const confirmationCode = crypto
            .createHash('sha256')
            .update(`${payload?.user_id || 'unknown'}:${instagramConfig.appId}`)
            .digest('hex')
            .slice(0, 16);
        const origin = new URL(instagramConfig.redirectUri).origin;
        return res.status(HttpStatus.OK).json({
            url: `${origin}/api/v1/web/instagram/data-deletion?code=${confirmationCode}`,
            confirmation_code: confirmationCode,
        });
    } catch (err) {
        logger.error(`IG data-deletion error: ${err instanceof Error ? err.message : String(err)}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Data deletion failed.' });
    }
};

/**
 * GET /web/instagram/data-deletion?code=...
 * Human-readable status page Meta links the user to after a deletion request.
 */
export const instagramDataDeletionStatusController = async (req: Request, res: Response) => {
    const code = (req.query?.code as string | undefined) || '';
    return res.status(HttpStatus.OK).send(
        `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
        <h2>Instagram data deletion</h2>
        <p>Your Instagram data connected to Ampli5 has been deleted.</p>
        ${code ? `<p>Confirmation code: <code>${code}</code></p>` : ''}
        </body></html>`
    );
};
