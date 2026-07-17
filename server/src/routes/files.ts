import { Router } from 'express';
import { getUploadedFile } from '../controllers/files';

const router = Router();

// Auth is resolved inside the controller (it also accepts ?token= as a
// fallback for <a>/<iframe> embeds, which can't send an Authorization
// header) rather than the standard `authenticate` middleware.
router.get('/:folder/:filename', getUploadedFile);

export default router;
