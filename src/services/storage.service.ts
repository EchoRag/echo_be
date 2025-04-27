import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/app-error';
import { getMimeType } from '../utils/mime-type.util';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private static instance: StorageService;
  private storage: Storage;
  private bucket: string;

  private constructor() {
    let serviceAccountPath;
    if (process.env.firebase) {
      serviceAccountPath = JSON.parse(process.env.firebase);
    } else {
      serviceAccountPath = path.join(process.cwd(), 'creds', 'service.json');
    }

    this.storage = new Storage({
      keyFilename: serviceAccountPath,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
    this.bucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || '';
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async uploadFile(filePath: string, originalFileName: string): Promise<string> {
    try {
      const fileExtension = path.extname(originalFileName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      
      const bucket = this.storage.bucket(this.bucket);
      await bucket.upload(filePath, {
        destination: uniqueFileName,
        metadata: {
          contentType: getMimeType(originalFileName)
        }
      });
      
      // Delete the local file after upload
      fs.unlinkSync(filePath);
      
      // Return the unique file name for future signed URL generation
      return uniqueFileName;
    } catch (error) {
      throw new AppError(500, `Failed to upload file to Google Cloud Storage: ${error.message}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucket);
      const blob = bucket.file(fileName);
      await blob.delete();
    } catch (error) {
      throw new AppError(500, `Failed to delete file from Google Cloud Storage: ${error.message}`);
    }
  }

  async deleteFiles(filePaths: string[]): Promise<void> {
    const bucket = this.storage.bucket(this.bucket);

    const deletePromises = filePaths.map((filePath) => {
      return bucket.file(filePath).delete().catch((err) => {
        console.error(`Error deleting file ${filePath}:`, err.message);
      });
    });

    await Promise.all(deletePromises);
  }

  async getSignedUrl(fileName: string, expiresIn: number = 3600): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucket);
      const blob = bucket.file(fileName);
      const [url] = await blob.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 1000
      });
      return url;
    } catch (error) {
      throw new AppError(500, `Failed to generate signed URL: ${error.message}`);
    }
  }

  getBucket() {
    return this.storage.bucket(this.bucket);
  }
}
