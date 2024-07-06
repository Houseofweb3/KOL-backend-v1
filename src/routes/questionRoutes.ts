import express from 'express';
import { createQuestionHandler, getQuestionsHandler, updateQuestionHandler, deleteQuestionHandler } from '../controllers/questionController';

const router = express.Router();

router.post('/create', createQuestionHandler); // Endpoint for creating a question
router.get('/fetch', getQuestionsHandler); // Endpoint for retrieving questions
router.patch('/update', updateQuestionHandler); // Endpoint for updating a question
router.delete('/delete', deleteQuestionHandler); // Endpoint for deleting a question

export default router;
