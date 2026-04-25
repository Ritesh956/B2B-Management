import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { globalSearch } from '../controllers/search';

const router = Router();

router.get('/', authenticate, globalSearch);

export default router;