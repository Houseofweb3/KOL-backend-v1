import { Router } from 'express';
import { 
  createPackageHandler, 
  getPackageByIdHandler, 
  getAllPackagesHandler, 
  updatePackageByIdHandler, 
  deletePackageByIdHandler 
} from '../../controllers/v1/packageController';

const router = Router();

router.post('/', createPackageHandler);
router.get('/:id', getPackageByIdHandler);
router.get('/', getAllPackagesHandler);
router.put('/:id', updatePackageByIdHandler);
router.delete('/:id', deletePackageByIdHandler);

export default router;
