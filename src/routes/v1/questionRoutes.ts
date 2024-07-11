import express from 'express';
import { createQuestionController, getQuestionController } from '../../controllers/v1/questionController';

const router = express.Router();


router.post('/', createQuestionController);
router.get('/:id?', getQuestionController);

export default router;
