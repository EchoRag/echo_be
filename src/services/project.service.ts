import { AppDataSource } from '../config/database';
import { Project } from '../models/project.model';
import { Document } from '../models/document.model';
import { AppError } from '../utils/app-error';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';
import { In } from 'typeorm';

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private documentRepository = AppDataSource.getRepository(Document);


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
      // Deleting all the documents in a single query
      const documentIds= project.documents.map(document=>document.id);
      try {
        await this.documentRepository.delete({
          id: In(documentIds), // Deletes all documents whose Ids are in the array
        });
        logger.info(`Documents deleted from database: ${documentIds.join(', ')}`);
      } catch (err) {
        logger.error('Error deleting documents from database:', err);
      }
    }
  


    // Try deleting the project from the database
    try {
      await this.projectRepository.remove(project);
      logger.info(`Project deleted from database: ${project.id}`);
      
    } catch (error) {
      logger.error('Error deleting project from database:', error);
      
    }
  }
}
