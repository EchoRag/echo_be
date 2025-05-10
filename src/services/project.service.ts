import { AppDataSource } from '../config/database';
import { Project } from '../models/project.model';
import { Document } from '../models/document.model';
import { AppError } from '../utils/app-error';
import logger from '../config/logger';
import { In } from 'typeorm';
import { StorageService } from './storage.service'; // import your storage service

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private documentRepository = AppDataSource.getRepository(Document);
  private storageService = new StorageService(); // create instance of storage service



  async createProject(data: Partial<Project>): Promise<Project> {
    const project = this.projectRepository.create(data);
    return await this.projectRepository.save(project);
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id }, relations: ['documents'] });
    if (!project) {
      throw new AppError(404, 'Project not found');
    }
    return project;
  }

  async getAllProjects(userId: string): Promise<Project[]> {
    logger.info(`Getting all projects for user ${userId}`);
    return await this.projectRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const project = await this.getProjectById(id);
    Object.assign(project, data);
    return await this.projectRepository.save(project);
  }

  /**
   * Deletes a project and its associated documents
   * @param id - Project ID
   */
  async deleteProject(id: string): Promise<void> {
    const project = await this.getProjectById(id);

    // Check if project has documents and delete them from local storage
    if (project.documents && project.documents.length > 0) {
      const documentIds = project.documents.map(doc => doc.id);
      const filePaths = project.documents
        .filter(doc => !!doc.filePath)
        .map(doc => doc.filePath as string);
        
        //Delete files from cloud storage
            if (filePaths.length > 0) {
        try {
          await this.storageService.deleteFiles(filePaths);
          logger.info(`Files deleted from cloud storage: ${filePaths.join(', ')}`);
        } catch (error) {
          logger.error('Error deleting files from cloud storage:', error);
        }
      }
      
    // Try deleting the project from the database
    try {
      await this.documentRepository.delete({ id: In(documentIds) });
      logger.info(`Documents deleted from database: ${documentIds.join(', ')}`);
    } catch (error) {
      logger.error('Error deleting documents from database:', error);
    }
     // Finally delete the project itself
     try {
      await this.projectRepository.remove(project);
      logger.info(`Project deleted from database: ${project.id}`);
    } catch (error) {
      logger.error('Error deleting project from database:', error);
    }
  }
  }}
