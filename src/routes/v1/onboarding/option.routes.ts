import { Router } from 'express';
import {
  createOptionController,
  getOptionController,
  getAllOptionsController,
  updateOptionController,
  deleteOptionController
} from '../../../controllers/v1/onboarding';

const router = Router();

router.post('/', createOptionController);
router.get('/:id', getOptionController);
router.get('/', getAllOptionsController);
router.put('/:id', updateOptionController);
router.delete('/:id', deleteOptionController);

export { router as optionRoutes };
