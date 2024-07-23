import { Router } from 'express';
import multer from 'multer';
import { 
  createPackageHandler, 
  getPackageByIdHandler, 
  getAllPackagesHandler, 
  updatePackageByIdHandler, 
  deletePackageByIdHandler
} from '../../../controllers/v1/package';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', createPackageHandler);
router.get('/:id', getPackageByIdHandler);
router.get('/', getAllPackagesHandler);
router.put('/:id', updatePackageByIdHandler);
router.delete('/:id', deletePackageByIdHandler);

export { router as packageRoutes };
