import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();
const documentController = new DocumentController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Document routes
router.post('/documents', 
  authenticateUser, 
  upload.single('file'), 
  documentController.uploadDocument
);

router.get('/projects/:projectId/documents', 
  authenticateUser, 
  documentController.getAllDocuments
);

router.get('/documents/:id', 
  authenticateUser, 
  documentController.getDocumentById
);

router.put('/documents/:id', 
  authenticateUser, 
  documentController.updateDocument
);

router.delete('/documents/:id', 
  authenticateUser, 
  documentController.deleteDocument
);

export default router; 