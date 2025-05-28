import { Router } from 'express';
import { sendBountyBookingEmail } from '../../../controllers/v1/bounty/bountyBookingController';

const router = Router();
router.post('/book', sendBountyBookingEmail);
export { router as bountyBookingRoutes };