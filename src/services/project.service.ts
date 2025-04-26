import { AppDataSource } from '../config/database';
import { Project } from '../models/project.model';
import { Document } from '../models/document.model';
import { AppError } from '../utils/app-error';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private documentRepository = AppDataSource.getRepository(Document);

  
  constructor() {
    if (!this.projectRepository) {
      console.log('Project repository not initialized');
    }
  }

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
      for (const document of project.documents) {
        if (document.filePath) {
          try {
            const filePath = path.join(__dirname, '..', 'uploads', document.filePath);

            fs.exists(filePath, (exists) => {
              if (exists) {
                fs.unlink(filePath, (err) => {
                  if (err) {
                    logger.error('Error deleting file:', err);
                  } else {
                    logger.info('File deleted successfully:', filePath);
                    console.log(`File ${filePath} deleted successfully from local storage.`);
                  }
                });
              } else {
                logger.warn('File does not exist:', filePath);
              }
            });
          } catch (error) {
            logger.error('Error while trying to delete document:', error);
          }
        }
      }

      // Delete the documents from the database
      await Promise.all(
        project.documents.map(async (document) => {
          try {
            await this.documentRepository.remove(document);
            logger.info(`Document deleted from database: ${document.id}`);
          } catch (err) {
            logger.error('Error deleting document from database:', err);
          }
        })
      );
    }

    // Try deleting the project from the database
    try {
      await this.projectRepository.remove(project);
      logger.info(`Project deleted from database: ${project.id}`);
      console.log('Project deleted from database');
    } catch (error) {
      logger.error('Error deleting project from database:', error);
      console.log('Error deleting project:', error);
    }
  }
}
