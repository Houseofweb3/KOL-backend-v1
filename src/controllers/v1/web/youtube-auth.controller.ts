import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { ENV } from '../../../config/env';
import {
  buildYoutubeOAuthUrl,
  consumeYoutubeState,
  connectYoutubeAccount,
  disconnectYoutubeAccountByChannelId,
} from '../../../services/v1/web/youtube-auth.service';

/**
 * Tiny HTML page returned from the OAuth callback. It posts the result back to the
 * opener window (the frontend that launched the popup) and closes itself. Payload is
 * JSON-serialized into a postMessage scoped to FRONTEND_ORIGIN.
 */
function closePopup(payload: Record<string, unknown>): string {
  // Stable marker so the opener can distinguish our messages from other postMessages.
  const data = JSON.stringify({ source: 'ampli5-youtube', ...payload });
  const origin = JSON.stringify(ENV.FRONTEND_ORIGIN || '*');
  return `<!doctype html><html><body>Connecting…<script>
    (function () {
      try { window.opener && window.opener.postMessage(${data}, ${origin}); } catch (e) {}
      window.close();
    })();
    </script></body></html>`;
}

/**
 * GET /web/youtube/oauth-url
 * Returns the Google authorize URL for the frontend to open in a popup.
 */
export const getYoutubeOAuthUrlController = async (_req: Request, res: Response) => {
  try {
    const { url, state } = buildYoutubeOAuthUrl();
    return res.status(HttpStatus.OK).json({ success: true, url, state });
  } catch (error) {
    const e = error as { status?: number; message?: string };
    const status = e.status || HttpStatus.INTERNAL_SERVER_ERROR;
    logger.error(`YT oauth-url error (${status}): ${e.message}`);
    return res.status(status).json({ success: false, message: 'Could not start YouTube login.' });
  }
};

/**
 * GET /web/youtube/callback
 * Google redirects here with ?code & ?state (or ?error). Responds with the
 * popup-close HTML carrying the connection summary or an error.
 */
export const youtubeCallbackController = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  // User denied/closed the Google consent screen.
  if (error) {
    logger.warn(`YT callback returned error: ${error}`);
    const cancelled = error === 'access_denied';
    return res.send(
      closePopup({
        success: false,
        reason: cancelled ? 'cancelled' : 'denied',
        error: cancelled
          ? 'YouTube login was cancelled.'
          : 'Google did not grant access. Please try again and approve the requested permissions.',
      })
    );
  }

  try {
    consumeYoutubeState(state);
    const { summary } = await connectYoutubeAccount(String(code || ''));
    return res.send(closePopup({ success: true, youtube: summary }));
  } catch (err) {
    // Log the real cause server-side only; never leak server/status codes to the client.
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`YT callback error: ${message}`);
    return res.send(
      closePopup({
        success: false,
        reason: 'failed',
        error: 'We couldn’t connect your YouTube channel. Please make sure you selected a channel and try again.',
      })
    );
  }
};

/**
 * POST /web/youtube/disconnect
 * In-app "Disconnect" button. Body: { channelId }. Soft-deletes the account + clears
 * stored tokens. No auth (onboarding runs pre-login); idempotent.
 */
export const disconnectYoutubeController = async (req: Request, res: Response) => {
  try {
    const channelId = (req.body?.channelId as string | undefined)?.trim();
    if (!channelId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'channelId is required' });
    }
    await disconnectYoutubeAccountByChannelId(channelId);
    return res.status(HttpStatus.OK).json({ success: true });
  } catch (err) {
    logger.error(`YT disconnect error: ${err instanceof Error ? err.message : String(err)}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Could not disconnect.' });
  }
};
