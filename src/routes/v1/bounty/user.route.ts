import { Router } from 'express';
import { userProfileGet } from '../../../controllers/v1/bounty/userController';

const router = Router();
router.get('/details/:id', userProfileGet);
export { router as userProfileRoutes };
