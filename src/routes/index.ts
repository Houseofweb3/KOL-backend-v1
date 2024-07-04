import { Router } from 'express';
import exampleRouter from './example';

const router = Router();

router.use(exampleRouter);

export default router;

