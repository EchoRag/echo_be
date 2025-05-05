import { ProjectService } from '../project.service';
import { AppDataSource } from '../../config/database';
import { Project } from '../../models/project.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/app-error';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: any;

  const mockUser: User = {
    id: 'test-user-id',
    providerUid: 'test-provider-id',
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

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mock
    mockProjectRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockProjectRepository);

    // Create service instance
    projectService = new ProjectService();
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const projectData: Partial<Project> = {
        name: 'New Project',
        description: 'New Description',
        user: mockUser,
      };

      mockProjectRepository.create.mockReturnValue(projectData);
      mockProjectRepository.save.mockResolvedValue({
        ...projectData,
        id: mockProject.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      const result = await projectService.createProject(projectData);

      expect(mockProjectRepository.create).toHaveBeenCalledWith(projectData);
      expect(mockProjectRepository.save).toHaveBeenCalledWith(projectData);
      expect(result).toEqual({
        ...projectData,
        id: mockProject.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('getProjectById', () => {
    it('should return project if found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);

      const result = await projectService.getProjectById(mockProject.id);

      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      });
      expect(result).toEqual(mockProject);
    });

    it('should throw error if project not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(projectService.getProjectById(mockProject.id))
        .rejects.toThrow(new AppError(404, 'Project not found'));
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects for user', async () => {
      const projects = [mockProject];
      mockProjectRepository.find.mockResolvedValue(projects);

      const result = await projectService.getAllProjects(mockUser.id);

      expect(mockProjectRepository.find).toHaveBeenCalledWith({
        where: { user: { id: mockUser.id } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(projects);
    });

    it('should return empty array if no projects found', async () => {
      mockProjectRepository.find.mockResolvedValue([]);

      const result = await projectService.getAllProjects(mockUser.id);

      expect(mockProjectRepository.find).toHaveBeenCalledWith({
        where: { user: { id: mockUser.id } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('updateProject', () => {
    it('should update project if found', async () => {
      const updateData: Partial<Project> = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        ...updateData,
      });

      const result = await projectService.updateProject(mockProject.id, updateData);

      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      });
      expect(mockProjectRepository.save).toHaveBeenCalledWith({
        ...mockProject,
        ...updateData,
      });
      expect(result).toEqual({
        ...mockProject,
        ...updateData,
      });
    });

    it('should throw error if project not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(projectService.updateProject(mockProject.id, { name: 'Updated' }))
        .rejects.toThrow(new AppError(404, 'Project not found'));
    });
  });

  describe('deleteProject', () => {
    it('should delete project if found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.remove.mockResolvedValue(mockProject);

      await projectService.deleteProject(mockProject.id);

      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      });
      expect(mockProjectRepository.remove).toHaveBeenCalledWith(mockProject);
    });

    it('should throw error if project not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(projectService.deleteProject(mockProject.id))
        .rejects.toThrow(new AppError(404, 'Project not found'));
    });
  });
}); 