import express from 'express';
import { handler } from '../controllers/checkoutController';

const router = express.Router();

router.post('/create', handler);

export default router;
