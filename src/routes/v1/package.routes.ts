import { Router } from 'express';
import multer from 'multer';
import { 
  createPackageHandler, 
  getPackageByIdHandler, 
  getAllPackagesHandler, 
  updatePackageByIdHandler, 
  deletePackageByIdHandler ,
  parseAndSaveCSVHandler
} from '../../controllers/v1/packageController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', createPackageHandler);
router.get('/:id', getPackageByIdHandler);
router.get('/', getAllPackagesHandler);
router.put('/:id', updatePackageByIdHandler);
router.delete('/:id', deletePackageByIdHandler);
router.post('/upload', upload.single('file'), parseAndSaveCSVHandler);

export default router;
