import { Request, Response } from 'express';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { User } from '../../models/user.model';

// Mock the service
jest.mock('../../services/project.service');

describe('ProjectController', () => {
  let projectController: ProjectController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockProjectService: jest.Mocked<ProjectService>;

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    providerUid: 'test-provider-id',
    projects: [],
    conversations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Setup mock request
    mockRequest = {
      params: {},
      body: {},
      user: undefined,
    };

    nextFunction = jest.fn();

    // Setup mock service
    mockProjectService = {
      createProject: jest.fn(),
      getAllProjects: jest.fn(),
      getProjectById: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
    } as unknown as jest.Mocked<ProjectService>;

    // Mock ProjectService constructor
    (ProjectService as jest.Mock).mockImplementation(() => mockProjectService);
    
    projectController = new ProjectController();
  });

  describe('createProject', () => {
    const mockProject: Project = {
      id: 'test-project-id',
      name: 'Test Project',
      description: 'Test Description',
      imageUrl: 'https://example.com/image.jpg',
      metadata: { key: 'value' },
      user: mockUser,
      documents: [],
      price: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create project successfully', async () => {
      mockRequest.body = {
        name: 'Test Project',
        description: 'Test Description',
        imageUrl: 'https://example.com/image.jpg',
        metadata: { key: 'value' },
      };
      mockRequest.user = mockUser;

      mockProjectService.createProject.mockResolvedValue(mockProject);

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description',
        imageUrl: 'https://example.com/image.jpg',
        metadata: { key: 'value' },
        user: { id: 'test-user-id' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockProject);
    });

    it('should handle empty request body', async () => {
      mockRequest.body = undefined;
      mockRequest.user = mockUser;

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.createProject).not.toHaveBeenCalled();
    });
  });

  describe('getAllProjects', () => {
    const mockProjects: Project[] = [
      {
        id: 'project1',
        name: 'Project 1',
        description: 'Description 1',
        user: mockUser,
        documents: [],
        price: 0,
        isActive: true,
        imageUrl: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'project2',
        name: 'Project 2',
        description: 'Description 2',
        user: mockUser,
        documents: [],
        price: 0,
        isActive: true,
        imageUrl: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should get all projects for authenticated user', async () => {
      mockRequest.user = mockUser;
      mockProjectService.getAllProjects.mockResolvedValue(mockProjects);

      await projectController.getAllProjects(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.getAllProjects).toHaveBeenCalledWith('test-user-id');
      expect(mockResponse.json).toHaveBeenCalledWith(mockProjects);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await projectController.getAllProjects(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.getAllProjects).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });
  });

  describe('getProjectById', () => {
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

    it('should get project by id successfully', async () => {
      mockRequest.params = { id: 'test-project-id' };
      mockProjectService.getProjectById.mockResolvedValue(mockProject);

      await projectController.getProjectById(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.getProjectById).toHaveBeenCalledWith('test-project-id');
      expect(mockResponse.json).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('updateProject', () => {
    const mockProject: Project = {
      id: 'test-project-id',
      name: 'Updated Project',
      description: 'Updated Description',
      imageUrl: 'https://example.com/new-image.jpg',
      metadata: { newKey: 'newValue' },
      user: mockUser,
      documents: [],
      price: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update project successfully', async () => {
      mockRequest.params = { id: 'test-project-id' };
      mockRequest.body = {
        name: 'Updated Project',
        description: 'Updated Description',
        imageUrl: 'https://example.com/new-image.jpg',
        metadata: { newKey: 'newValue' },
      };

      mockProjectService.updateProject.mockResolvedValue(mockProject);

      await projectController.updateProject(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        'test-project-id',
        {
          name: 'Updated Project',
          description: 'Updated Description',
          imageUrl: 'https://example.com/new-image.jpg',
          metadata: { newKey: 'newValue' },
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      mockRequest.params = { id: 'test-project-id' };
      mockProjectService.deleteProject.mockResolvedValue();

      await projectController.deleteProject(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('test-project-id');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });
}); 