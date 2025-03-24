import { AppDataSource } from '../config/database';
import { Project } from '../models/project.model';
import { AppError } from '../middlewares/error.middleware';

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);

  async createProject(data: Partial<Project>): Promise<Project> {
    const project = this.projectRepository.create(data);
    return await this.projectRepository.save(project);
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new AppError(404, 'Project not found');
    }
    return project;
  }

  async getAllProjects(userId: string): Promise<Project[]> {
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

  async deleteProject(id: string): Promise<void> {
    const project = await this.getProjectById(id);
    await this.projectRepository.remove(project);
  }
} 