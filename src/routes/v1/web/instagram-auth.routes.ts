import express from 'express';
import {
    getInstagramOAuthUrlController,
    instagramCallbackController,
    disconnectInstagramController,
    instagramDeauthorizeController,
    instagramDataDeletionController,
    instagramDataDeletionStatusController,
} from '../../../controllers/v1/web/instagram-auth.controller';

const router = express.Router();

/**
 * Instagram Login (instagram.com OAuth). No auth: the popup flow runs before the
 * creator is linked. Mounted at /web/instagram, so the registered redirect URI is
 * <PUBLIC_BASE>/api/v1/web/instagram/callback — keep IG_REDIRECT_URI in sync.
 */
router.get('/oauth-url', getInstagramOAuthUrlController);
router.get('/callback', instagramCallbackController);

// In-app disconnect (Disconnect button on the onboarding form).
router.post('/disconnect', disconnectInstagramController);

// Meta-required callbacks (configured in Business login settings). Both receive a
// signed_request POST. Register these exact URLs in the Meta app:
//   Deauthorize callback URL  → <PUBLIC_BASE>/api/v1/web/instagram/deauthorize
//   Data deletion request URL → <PUBLIC_BASE>/api/v1/web/instagram/data-deletion
router.post('/deauthorize', instagramDeauthorizeController);
router.post('/data-deletion', instagramDataDeletionController);
router.get('/data-deletion', instagramDataDeletionStatusController);

export { router as instagramAuthRoutes };
