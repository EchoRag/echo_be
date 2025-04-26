import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { AppError } from '../utils/app-error';
import { RabbitMQService } from '../services/rabbitmq.service';
import { Document, DocumentStatus } from '../models/document.model';
// Extend the Request type to include the file property
interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

interface UpdateStatusRequest {
  status: DocumentStatus;
  errorDescription?: string;
}

export class DocumentController {
  private documentService = new DocumentService();
  private rabbitMQService = new RabbitMQService();

  /**
   * @swagger
   * /api/v1/documents:
   *   post:
   *     summary: Upload a new document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - file
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *               description:
   *                 type: string
   */
  uploadDocument = async (req: RequestWithFile, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(400, 'No file uploaded');
      }

      const { fileName, isCallRecording, isCallTranscript, projectId } = req.body;
      const project = await this.documentService.getProjectById(projectId);

      // Upload file to Google Cloud Storage
      const fileUrl = await this.documentService.uploadFile(
        file.path,
        fileName || file.originalname
      );

      const document = await this.documentService.createDocument({
        fileName: fileName || file.originalname,
        filePath: fileUrl,
        description: req.body.description,
        isCallRecording: isCallRecording === 'true',
        isCallTranscript: isCallTranscript === 'true',
        project,
      });

      // Publish document ID to RabbitMQ
      await this.rabbitMQService.publishMessage('document_uploaded', document.id);

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/documents:
   *   get:
   *     summary: Get all documents for a project
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   */
  getAllDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await this.documentService.getDocumentsByProject(req.params.projectId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/documents/{id}:
   *   get:
   *     summary: Get a document by ID
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document: Document = await this.documentService.getDocumentById(req.params.id);
      
      // Get signed URL for the file
      const signedUrl = await this.documentService.getSignedUrl(document.fileName);
      
      res.json({
        ...document,
        downloadUrl: signedUrl
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/documents/{id}:
   *   put:
   *     summary: Update a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               description:
   *                 type: string
   */
  updateDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document = await this.documentService.updateDocument(req.params.id, req.body);
      res.json(document);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/documents/{id}:
   *   delete:
   *     summary: Delete a document
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.documentService.deleteDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/document/project/{projectId}:
   *   get:
   *     summary: Get all documents for a project
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of documents for the project
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Document'
   */
  getDocumentsByProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const documents = await this.documentService.getDocumentsByProject(projectId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/document/{id}/status:
   *   put:
   *     summary: Update document status
   *     tags: [Documents]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, processed, error]
   *               errorDescription:
   *                 type: string
   *     responses:
   *       200:
   *         description: Document status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Document'
   */
  updateDocumentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, errorDescription } = req.body as UpdateStatusRequest;
      
      if (!Object.values(DocumentStatus).includes(status)) {
        throw new AppError(400, 'Invalid status value');
      }

      const document = await this.documentService.updateDocumentStatus(id, status, errorDescription);
      
      // Send response immediately
      res.json(document);

      // Process queued requests in the background
      if (status === DocumentStatus.PROCESSED) {
        this.rabbitMQService.publishMessage('document_processed', document.id)
          .catch(error => {
            console.error('Error publishing document processed message:', error);
          });
      }
    } catch (error) {
      next(error);
    }
  };
} 
