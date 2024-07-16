import { Router } from 'express';
import {
  createOptionController,
  getOptionController,
  getAllOptionsController,
  updateOptionController,
  deleteOptionController
} from '../../controllers/v1/optionController';

const router = Router();

router.post('/', createOptionController);
router.get('/:id', getOptionController);
router.get('/', getAllOptionsController);
router.put('/:id', updateOptionController);
router.delete('/:id', deleteOptionController);

export default router;
