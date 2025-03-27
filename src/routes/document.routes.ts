import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateUser, extractUser } from '../middlewares/auth.middleware';

const router = Router();
const documentController = new DocumentController();

// Apply authentication middleware to all routes
router.use(authenticateUser);
router.use(extractUser);

// Document Routes
router.post('/', documentController.uploadDocument);
router.get('/', documentController.getAllDocuments);
router.get('/:id', documentController.getDocumentById);
router.delete('/:id', documentController.deleteDocument);

export default router;
