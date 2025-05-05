import { StorageService } from '../storage.service';
import { Storage } from '@google-cloud/storage';
import { AppError } from '../../utils/app-error';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('@google-cloud/storage');
jest.mock('fs');
jest.mock('uuid');
jest.mock('../../utils/mime-type.util', () => ({
  getMimeType: jest.fn().mockReturnValue('image/jpeg'),
}));

describe('StorageService', () => {
  let storageService: StorageService;
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: any;
  let mockFile: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock file
    mockFile = {
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    // Setup mock bucket
    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
      upload: jest.fn(),
    };

    // Setup mock storage
    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    } as unknown as jest.Mocked<Storage>;

    // Mock Storage constructor
    (Storage as unknown as jest.Mock).mockImplementation(() => mockStorage);

    // Mock environment variables
    process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET = 'test-bucket';

    // Reset singleton instance
    (StorageService as any).instance = undefined;
    
    // Create service instance
    storageService = StorageService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = StorageService.getInstance();
      const instance2 = StorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('uploadFile', () => {
    const filePath = '/path/to/file.jpg';
    const originalFileName = 'test.jpg';
    const uniqueFileName = '123e4567-e89b-12d3-a456-426614174000.jpg';

    beforeEach(() => {
      (uuidv4 as jest.Mock).mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should upload file successfully', async () => {
      mockBucket.upload.mockResolvedValue([{ name: uniqueFileName }]);

      const result = await storageService.uploadFile(filePath, originalFileName);

      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.upload).toHaveBeenCalledWith(filePath, {
        destination: uniqueFileName,
        metadata: {
          contentType: 'image/jpeg',
        },
      });
      expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
      expect(result).toBe(uniqueFileName);
    });

    it('should throw error when upload fails', async () => {
      const error = new Error('Upload failed');
      mockBucket.upload.mockRejectedValue(error);

      await expect(storageService.uploadFile(filePath, originalFileName)).rejects.toThrow(
        new AppError(500, `Failed to upload file to Google Cloud Storage: ${error.message}`)
      );
    });

    it('should throw error when file deletion fails', async () => {
      mockBucket.upload.mockResolvedValue([{ name: uniqueFileName }]);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Delete failed');
      });

      await expect(storageService.uploadFile(filePath, originalFileName)).rejects.toThrow(
        new AppError(500, 'Failed to upload file to Google Cloud Storage: Delete failed')
      );
    });
  });

  describe('deleteFile', () => {
    const fileName = 'test.jpg';

    it('should delete file successfully', async () => {
      mockFile.delete.mockResolvedValue([]);

      await storageService.deleteFile(fileName);

      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.file).toHaveBeenCalledWith(fileName);
      expect(mockFile.delete).toHaveBeenCalled();
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Delete failed');
      mockFile.delete.mockRejectedValue(error);

      await expect(storageService.deleteFile(fileName)).rejects.toThrow(
        new AppError(500, `Failed to delete file from Google Cloud Storage: ${error.message}`)
      );
    });
  });

  describe('getSignedUrl', () => {
    const fileName = 'test.jpg';
    const signedUrl = 'https://storage.googleapis.com/test-bucket/test.jpg?signature=xyz';
    const expiresIn = 3600;

    it('should generate signed URL successfully', async () => {
      mockFile.getSignedUrl.mockResolvedValue([signedUrl]);

      const result = await storageService.getSignedUrl(fileName, expiresIn);

      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.file).toHaveBeenCalledWith(fileName);
      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      });
      expect(result).toBe(signedUrl);
    });

    it('should use default expiresIn when not provided', async () => {
      mockFile.getSignedUrl.mockResolvedValue([signedUrl]);

      await storageService.getSignedUrl(fileName);

      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      });
    });

    it('should throw error when signed URL generation fails', async () => {
      const error = new Error('URL generation failed');
      mockFile.getSignedUrl.mockRejectedValue(error);

      await expect(storageService.getSignedUrl(fileName)).rejects.toThrow(
        new AppError(500, `Failed to generate signed URL: ${error.message}`)
      );
    });
  });

  describe('getBucket', () => {
    it('should return bucket instance', () => {
      const bucket = storageService.getBucket();
      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(bucket).toBe(mockBucket);
    });
  });
}); 