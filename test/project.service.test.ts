import { ProjectService } from '../services/project.service';
import { AppDataSource } from '../config/database';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/app-error';

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: any;
  let mockUserRepository: any;

  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test Description',
    price: 99.99,
    imageUrl: 'https://example.com/image.jpg',
    metadata: {
      category: 'test',
      tags: ['test', 'project'],
    },
    user: { id: 'test-user-id' },
  };

  beforeAll(() => {
    mockProjectRepository = {
      create: jest.fn().mockReturnValue(mockProject),
      save: jest.fn().mockResolvedValue(mockProject),
      findOne: jest.fn().mockResolvedValue(mockProject),
      find: jest.fn().mockResolvedValue([mockProject]),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockUserRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'test-user-id' }),
    };

    AppDataSource.getRepository = jest.fn().mockImplementation((model) => {
      if (model === Project) return mockProjectRepository;
      if (model === User) return mockUserRepository;
    });

    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new project', async () => {
    const result = await projectService.createProject(mockProject);
    expect(mockProjectRepository.create).toHaveBeenCalledWith(mockProject);
    expect(mockProjectRepository.save).toHaveBeenCalledWith(mockProject);
    expect(result).toEqual(mockProject);
  });

  it('should get a project by ID', async () => {
    const result = await projectService.getProjectById('test-project-id');
    expect(mockProjectRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-project-id' } });
    expect(result).toEqual(mockProject);
  });

  it('should throw an error if project not found', async () => {
    mockProjectRepository.findOne.mockResolvedValueOnce(null);
    await expect(projectService.getProjectById('non-existent-id')).rejects.toThrow(AppError);
  });

  it('should get all projects for a user', async () => {
    const result = await projectService.getAllProjects('test-user-id');
    expect(mockProjectRepository.find).toHaveBeenCalledWith({
      where: { user: { id: 'test-user-id' } },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual([mockProject]);
  });

  it('should update a project', async () => {
    const updateData = { name: 'Updated Project', price: 149.99 };
    const result = await projectService.updateProject('test-project-id', updateData);
    expect(mockProjectRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-project-id' } });
    expect(mockProjectRepository.save).toHaveBeenCalledWith({ ...mockProject, ...updateData });
    expect(result).toEqual({ ...mockProject, ...updateData });
  });

  it('should delete a project', async () => {
    await projectService.deleteProject('test-project-id');
    expect(mockProjectRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-project-id' } });
    expect(mockProjectRepository.remove).toHaveBeenCalledWith(mockProject);
  });
});
