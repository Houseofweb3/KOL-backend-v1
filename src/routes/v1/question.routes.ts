import express from 'express';
import {
    createQuestionController,
    getQuestionController,
    deleteQuestionController
} from '../../controllers/v1/onboarding/questionController';

const router = express.Router();

router.post('/', createQuestionController);
router.get('/:id?', getQuestionController);
router.delete('/:id', deleteQuestionController);

export default router;
