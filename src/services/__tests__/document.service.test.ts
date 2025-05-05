import { DocumentService } from '../document.service';
import { AppDataSource } from '../../config/database';
import { Document, DocumentStatus } from '../../models/document.model';
import { Project } from '../../models/project.model';
import { User } from '../../models/user.model';
import { NotificationService } from '../notification.service';
import { StorageService } from '../storage.service';
import { AppError } from '../../utils/app-error';
import path from 'path';
import fs from 'fs';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    initialize: jest.fn(),
    destroy: jest.fn(),
  },
}));
jest.mock('../notification.service');
jest.mock('../storage.service');
jest.mock('fs');

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockDocumentRepository: any;
  let mockProjectRepository: any;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockStorageService: jest.Mocked<StorageService>;

  const mockUser: User = {
    id: 'test-user-id',
    providerUid: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    projects: [],
    conversations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject: Project = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test Description',
    user: mockUser,
    documents: [],
    price: 0,
    isActive: true,
    imageUrl: '',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument: Document = {
    id: 'test-document-id',
    fileName: 'test.pdf',
    filePath: 'test/test.pdf',
    status: DocumentStatus.PENDING,
    project: mockProject,
    description: '',
    isCallRecording: false,
    isCallTranscript: false,
    errorDescription: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mocks
    mockDocumentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    mockProjectRepository = {
      findOne: jest.fn(),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      switch (entity) {
        case Document:
          return mockDocumentRepository;
        case Project:
          return mockProjectRepository;
        default:
          return null;
      }
    });

    // Mock NotificationService
    mockNotificationService = {
      sendDocumentStatusNotification: jest.fn(),
      getInstance: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<NotificationService>;
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);

    // Mock StorageService
    mockStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getSignedUrl: jest.fn(),
      getBucket: jest.fn(),
      getInstance: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<StorageService>;
    (StorageService.getInstance as jest.Mock).mockReturnValue(mockStorageService);

    // Create service instance
    documentService = new DocumentService();
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const documentData = {
        fileName: 'test.pdf',
        filePath: 'test/test.pdf',
        project: mockProject,
      };

      mockDocumentRepository.create.mockReturnValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);

      const result = await documentService.createDocument(documentData);

      expect(mockDocumentRepository.create).toHaveBeenCalledWith(documentData);
      expect(mockDocumentRepository.save).toHaveBeenCalledWith(mockDocument);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('getDocumentById', () => {
    it('should return a document by id', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);

      const result = await documentService.getDocumentById(mockDocument.id);

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDocument.id },
        relations: ['project', 'project.user']
      });
      expect(result).toEqual(mockDocument);
    });

    it('should throw error if document not found', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(documentService.getDocumentById('non-existent-id'))
        .rejects.toThrow(new AppError(404, 'Document not found'));
    });
  });

  describe('getDocumentsByProject', () => {
    it('should return documents for a project', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockDocumentRepository.find.mockResolvedValue([mockDocument]);

      const result = await documentService.getDocumentsByProject(mockProject.id);

      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id }
      });
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        where: { project: { id: mockProject.id } },
        order: { createdAt: 'DESC' }
      });
      expect(result).toEqual([mockDocument]);
    });

    it('should throw error if project not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(documentService.getDocumentsByProject('non-existent-id'))
        .rejects.toThrow(new AppError(404, 'Project not found'));
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update document status and send notification', async () => {
      const updatedDocument = {
        ...mockDocument,
        status: DocumentStatus.PROCESSED,
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);
      mockNotificationService.sendDocumentStatusNotification.mockResolvedValue({} as any);

      const result = await documentService.updateDocumentStatus(
        mockDocument.id,
        DocumentStatus.PROCESSED
      );

      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        status: DocumentStatus.PROCESSED
      });
      expect(mockNotificationService.sendDocumentStatusNotification).toHaveBeenCalledWith(
        mockUser.providerUid,
        mockDocument.id,
        mockProject.id,
        DocumentStatus.PROCESSED,
        mockDocument.fileName,
        undefined
      );
      expect(result).toEqual(updatedDocument);
    });

    it('should include error description if provided', async () => {
      const errorDescription = 'Test error';
      const updatedDocument = {
        ...mockDocument,
        status: DocumentStatus.ERROR,
        errorDescription,
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);
      mockNotificationService.sendDocumentStatusNotification.mockResolvedValue({} as any);

      const result = await documentService.updateDocumentStatus(
        mockDocument.id,
        DocumentStatus.ERROR,
        errorDescription
      );

      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        status: DocumentStatus.ERROR,
        errorDescription
      });
      expect(mockNotificationService.sendDocumentStatusNotification).toHaveBeenCalledWith(
        mockUser.providerUid,
        mockDocument.id,
        mockProject.id,
        DocumentStatus.ERROR,
        mockDocument.fileName,
        errorDescription
      );
      expect(result).toEqual(updatedDocument);
    });
  });

  describe('updateDocument', () => {
    it('should update document with new data', async () => {
      const updateData = {
        fileName: 'updated.pdf',
      };
      const updatedDocument = {
        ...mockDocument,
        ...updateData,
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(updatedDocument);

      const result = await documentService.updateDocument(mockDocument.id, updateData);

      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        ...updateData
      });
      expect(result).toEqual(updatedDocument);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and its file', async () => {
      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockDocumentRepository.remove.mockResolvedValue(mockDocument);

      await documentService.deleteDocument(mockDocument.id);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        path.basename(mockDocument.filePath)
      );
      expect(mockDocumentRepository.remove).toHaveBeenCalledWith(mockDocument);
    });

    it('should not attempt to delete file if filePath is not set', async () => {
      const documentWithoutFile = {
        ...mockDocument,
        filePath: null,
      };

      mockDocumentRepository.findOne.mockResolvedValue(documentWithoutFile);
      mockDocumentRepository.remove.mockResolvedValue(documentWithoutFile);

      await documentService.deleteDocument(mockDocument.id);

      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
      expect(mockDocumentRepository.remove).toHaveBeenCalledWith(documentWithoutFile);
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return public URL', async () => {
      const filePath = 'test/test.pdf';
      const fileName = 'test.pdf';
      const publicUrl = 'https://storage.googleapis.com/test-bucket/test.pdf';

      mockStorageService.uploadFile.mockResolvedValue(publicUrl);

      const result = await documentService.uploadFile(filePath, fileName);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(filePath, fileName);
      expect(result).toBe(publicUrl);
    });

    it('should clean up local file if upload fails', async () => {
      const filePath = 'test/test.pdf';
      const fileName = 'test.pdf';
      const error = new Error('Upload failed');

      mockStorageService.uploadFile.mockRejectedValue(error);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await expect(documentService.uploadFile(filePath, fileName))
        .rejects.toThrow(error);

      expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL for file', async () => {
      const fileName = 'test.pdf';
      const signedUrl = 'https://storage.googleapis.com/test-bucket/test.pdf?signature=xyz';

      mockStorageService.getSignedUrl.mockResolvedValue(signedUrl);

      const result = await documentService.getSignedUrl(fileName);

      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(fileName);
      expect(result).toBe(signedUrl);
    });
  });

  describe('getStorageBucket', () => {
    it('should return storage bucket', () => {
      const mockBucket = {
        name: 'test-bucket',
        storage: {},
        acl: {},
        iam: {},
        crc32cGenerator: {},
      } as any;

      mockStorageService.getBucket.mockReturnValue(mockBucket);

      const result = documentService.getStorageBucket();

      expect(mockStorageService.getBucket).toHaveBeenCalled();
      expect(result).toBe(mockBucket);
    });
  });
}); 