import { Request, Response } from 'express';
import { DocumentController } from '../document.controller';
import { DocumentService } from '../../services/document.service';
import { RabbitMQService } from '../../services/rabbitmq.service';
import { AppError } from '../../utils/app-error';
import { Document, DocumentStatus } from '../../models/document.model';
import { Project } from '../../models/project.model';
import { Bucket } from '@google-cloud/storage';

// Mock the services
jest.mock('../../services/document.service');
jest.mock('../../services/rabbitmq.service');

describe('DocumentController', () => {
  let documentController: DocumentController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockDocumentService: jest.Mocked<DocumentService>;
  let mockRabbitMQService: jest.Mocked<RabbitMQService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    // Setup mock request
    mockRequest = {
      params: {},
      body: {},
      file: undefined,
    };

    nextFunction = jest.fn();

    // Get the mocked service instances
    mockDocumentService = DocumentService.prototype as jest.Mocked<DocumentService>;
    mockRabbitMQService = RabbitMQService.prototype as jest.Mocked<RabbitMQService>;
    documentController = new DocumentController();
  });

  describe('uploadDocument', () => {
    const mockFile = {
      path: '/tmp/test.pdf',
      originalname: 'test.pdf',
    } as Express.Multer.File;

    const mockProject = {
      id: 'test-project-id',
      name: 'Test Project',
    } as Project;

    const mockDocument = {
      id: 'test-doc-id',
      fileName: 'test.pdf',
      filePath: 'gs://bucket/test.pdf',
      description: 'Test document',
      isCallRecording: false,
      isCallTranscript: false,
      project: mockProject,
    } as Document;

    it('should upload document successfully', async () => {
      mockRequest.file = mockFile;
      mockRequest.body = {
        fileName: 'custom.pdf',
        description: 'Test document',
        isCallRecording: 'false',
        isCallTranscript: 'false',
        projectId: 'test-project-id',
      };

      mockDocumentService.getProjectById.mockResolvedValue(mockProject);
      mockDocumentService.uploadFile.mockResolvedValue('gs://bucket/test.pdf');
      mockDocumentService.createDocument.mockResolvedValue(mockDocument);
      mockRabbitMQService.publishMessage.mockResolvedValue();

      await documentController.uploadDocument(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.getProjectById).toHaveBeenCalledWith('test-project-id');
      expect(mockDocumentService.uploadFile).toHaveBeenCalledWith('/tmp/test.pdf', 'custom.pdf');
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith({
        fileName: 'custom.pdf',
        filePath: 'gs://bucket/test.pdf',
        description: 'Test document',
        isCallRecording: false,
        isCallTranscript: false,
        project: mockProject,
      });
      expect(mockRabbitMQService.publishMessage).toHaveBeenCalledWith('document_uploaded', 'test-doc-id');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockDocument);
    });

    it('should throw 400 error when no file is uploaded', async () => {
      await documentController.uploadDocument(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(400);
    });
  });

  describe('getAllDocuments', () => {
    it('should return all documents for a project', async () => {
      const mockDocuments = [
        { id: 'doc1', fileName: 'test1.pdf' },
        { id: 'doc2', fileName: 'test2.pdf' },
      ] as Document[];

      mockRequest.params = { projectId: 'test-project-id' };
      mockDocumentService.getDocumentsByProject.mockResolvedValue(mockDocuments);

      await documentController.getAllDocuments(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.getDocumentsByProject).toHaveBeenCalledWith('test-project-id');
      expect(mockResponse.json).toHaveBeenCalledWith(mockDocuments);
    });
  });

  describe('getDocumentById', () => {
    it('should stream document file', async () => {
      const mockDocument = {
        id: 'test-doc-id',
        fileName: 'test.pdf',
        filePath: 'gs://bucket/test.pdf',
      } as Document;

      const mockReadStream = {
        on: jest.fn().mockReturnThis(),
        pipe: jest.fn(),
      };

      const mockBucket = {
        file: jest.fn().mockReturnValue({
          createReadStream: jest.fn().mockReturnValue(mockReadStream),
        }),
      } as unknown as Bucket;

      mockRequest.params = { id: 'test-doc-id' };
      mockDocumentService.getDocumentById.mockResolvedValue(mockDocument);
      mockDocumentService.getStorageBucket.mockReturnValue(mockBucket);

      await documentController.getDocumentById(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.getDocumentById).toHaveBeenCalledWith('test-doc-id');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.pdf"');
      expect(mockReadStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('updateDocument', () => {
    it('should update document successfully', async () => {
      const mockDocument = {
        id: 'test-doc-id',
        fileName: 'test.pdf',
        description: 'Updated description',
      } as Document;

      mockRequest.params = { id: 'test-doc-id' };
      mockRequest.body = { description: 'Updated description' };
      mockDocumentService.updateDocument.mockResolvedValue(mockDocument);

      await documentController.updateDocument(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.updateDocument).toHaveBeenCalledWith('test-doc-id', { description: 'Updated description' });
      expect(mockResponse.json).toHaveBeenCalledWith(mockDocument);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      mockRequest.params = { id: 'test-doc-id' };
      mockDocumentService.deleteDocument.mockResolvedValue();

      await documentController.deleteDocument(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith('test-doc-id');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('getDocumentsByProject', () => {
    it('should return documents for a project', async () => {
      const mockDocuments = [
        { id: 'doc1', fileName: 'test1.pdf' },
        { id: 'doc2', fileName: 'test2.pdf' },
      ] as Document[];

      mockRequest.params = { projectId: 'test-project-id' };
      mockDocumentService.getDocumentsByProject.mockResolvedValue(mockDocuments);

      await documentController.getDocumentsByProject(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.getDocumentsByProject).toHaveBeenCalledWith('test-project-id');
      expect(mockResponse.json).toHaveBeenCalledWith(mockDocuments);
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update document status successfully', async () => {
      const mockDocument = {
        id: 'test-doc-id',
        status: DocumentStatus.PROCESSED,
      } as Document;

      mockRequest.params = { id: 'test-doc-id' };
      mockRequest.body = { status: DocumentStatus.PROCESSED };
      mockDocumentService.updateDocumentStatus.mockResolvedValue(mockDocument);
      mockRabbitMQService.publishMessage.mockResolvedValue();

      await documentController.updateDocumentStatus(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.updateDocumentStatus).toHaveBeenCalledWith(
        'test-doc-id',
        DocumentStatus.PROCESSED,
        undefined
      );
      expect(mockRabbitMQService.publishMessage).toHaveBeenCalledWith('document_processed', 'test-doc-id');
      expect(mockResponse.json).toHaveBeenCalledWith(mockDocument);
    });

    it('should throw 400 error for invalid status', async () => {
      mockRequest.params = { id: 'test-doc-id' };
      mockRequest.body = { status: 'invalid_status' };

      await documentController.updateDocumentStatus(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(400);
    });

    it('should handle error description', async () => {
      const mockDocument = {
        id: 'test-doc-id',
        status: DocumentStatus.ERROR,
        errorDescription: 'Processing failed',
      } as Document;

      mockRequest.params = { id: 'test-doc-id' };
      mockRequest.body = {
        status: DocumentStatus.ERROR,
        errorDescription: 'Processing failed',
      };
      mockDocumentService.updateDocumentStatus.mockResolvedValue(mockDocument);

      await documentController.updateDocumentStatus(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDocumentService.updateDocumentStatus).toHaveBeenCalledWith(
        'test-doc-id',
        DocumentStatus.ERROR,
        'Processing failed'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockDocument);
    });
  });
}); 