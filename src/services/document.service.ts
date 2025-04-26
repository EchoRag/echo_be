import { AppDataSource } from '../config/database';
import { Document, DocumentStatus } from '../models/document.model';
import { Project } from '../models/project.model';
import { AppError } from '../utils/app-error';
import { NotificationService } from './notification.service';
import { StorageService } from './storage.service';
import path from 'path';
import fs from 'fs';

export class DocumentService {
  private documentRepository = AppDataSource.getRepository(Document);
  private projectRepository = AppDataSource.getRepository(Project);
  private notificationService = NotificationService.getInstance();
  private storageService = StorageService.getInstance();

  async createDocument(data: Partial<Document>): Promise<Document> {
    const document = this.documentRepository.create(data);
    return await this.documentRepository.save(document);
  }

  async getDocumentById(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({ 
      where: { id },
      relations: ['project', 'project.user']
    });
    if (!document) {
      throw new AppError(404, 'Document not found');
    }
    return document;
  }

  async getDocumentsByProject(projectId: string): Promise<Document[]> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    return await this.documentRepository.find({
      where: { project: { id: projectId } },
      order: { createdAt: 'DESC' }
    });
  }

  async updateDocumentStatus(
    id: string, 
    status: DocumentStatus, 
    errorDescription?: string
  ): Promise<Document> {
    const document = await this.getDocumentById(id);
    
    document.status = status;
    if (errorDescription) {
      document.errorDescription = errorDescription;
    }

    const updatedDocument = await this.documentRepository.save(document);

    // Send notification about status change
    this.notificationService.sendDocumentStatusNotification(
      document.project.user.providerUid,
      document.id,
      document.project.id,
      status,
      document.fileName,
      errorDescription
    ).catch(error => {
      console.error('Error sending notification:', error);
      return null;
    });

    return updatedDocument;
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    const document = await this.getDocumentById(id);
    Object.assign(document, data);
    return await this.documentRepository.save(document);
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await this.getDocumentById(id);
    
    // Delete file from Google Cloud Storage
    if (document.filePath) {
      const fileName = path.basename(document.filePath);
      await this.storageService.deleteFile(fileName);
    }
    
    await this.documentRepository.remove(document);
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new AppError(404, 'Project not found');
    }
    return project;
  }

  async uploadFile(filePath: string, fileName: string): Promise<string> {
    try {
      // Upload to Google Cloud Storage
      const publicUrl = await this.storageService.uploadFile(filePath, fileName);
      return publicUrl;
    } catch (error) {
      // Clean up local file if upload fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  async getSignedUrl(fileName: string): Promise<string> {
    return await this.storageService.getSignedUrl(fileName);
  }
} 