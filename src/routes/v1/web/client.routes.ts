import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const router = express.Router();

router.post('/signup', (req: Request, res: Response): void => {
    res.status(StatusCodes.ACCEPTED).json({ message: 'Client signed up successfully' });
});


export { router as clientAuthRoutes };
