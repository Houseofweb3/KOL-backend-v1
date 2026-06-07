import express from 'express';
import {
  getYoutubeOAuthUrlController,
  youtubeCallbackController,
  disconnectYoutubeController,
} from '../../../controllers/v1/web/youtube-auth.controller';

const router = express.Router();

/**
 * YouTube Login (Google OAuth). No auth: the popup flow runs before the creator is
 * linked. Mounted at /web/youtube, so the registered redirect URI is
 * <PUBLIC_BASE>/api/v1/web/youtube/callback — keep YT_REDIRECT_URI in sync.
 */
router.get('/oauth-url', getYoutubeOAuthUrlController);
router.get('/callback', youtubeCallbackController);

// In-app disconnect (Disconnect button on the onboarding form).
router.post('/disconnect', disconnectYoutubeController);

export { router as youtubeAuthRoutes };
