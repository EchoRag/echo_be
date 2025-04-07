import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { AppError } from '../middlewares/error.middleware';
import { RabbitMQService } from '../services/rabbitmq.service';
import { Document } from 'src/models/document.model';
import { getMimeType } from '../utils/mime-type.util';
import fs from 'fs';
import path from 'path';

// Extend the Request type to include the file property
interface RequestWithFile extends Request {
  file?: Express.Multer.File;
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
      const document = await this.documentService.createDocument({
        fileName: fileName || file.originalname,
        filePath: file.path,
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
      const documents = await this.documentService.getAllDocuments(req.params.projectId);
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
      
      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        throw new AppError(404, 'File not found');
      }

      // Set headers for file download
      res.setHeader('Content-Type', getMimeType(document.fileName));
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);

      // Handle errors in the stream
      fileStream.on('error', (error) => {
        next(new AppError(500, 'Error reading file'));
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
} 
