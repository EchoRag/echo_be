import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateUser, extractUser,authenticateService } from '../middlewares/auth.middleware';
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

// Apply authentication middleware to all routes
// router.use(authenticateUser);
// router.use(extractUser);

// Document Routes
router.post('/documents', 
  authenticateUser, 
  extractUser,
  upload.single('file'), 
  documentController.uploadDocument
);
router.get('/documents/:id', 
  authenticateUser, 
  documentController.getDocumentById
);
router.get('/document/:id', 
  authenticateService, 
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
