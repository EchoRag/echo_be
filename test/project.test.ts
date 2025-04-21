import request from 'supertest';
import app from '../app';
import { AppDataSource } from '../config/database';
import { Project } from '../models/project.model';

describe('Project API', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockProject = {
    name: 'Test Project',
    description: 'Test Description',
    price: 99.99,
    imageUrl: 'https://example.com/image.jpg',
    metadata: {
      category: 'test',
      tags: ['test', 'project'],
    },
  };

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear the projects table before each test
    await AppDataSource.getRepository(Project).clear();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id)
        .send(mockProject);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(mockProject.name);
      expect(response.body.user.id).toBe(testUser.id);
    });

    it('should return 400 for invalid project data', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id)
        .send({ name: 'Test Project' }); // Missing required description

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should get all projects for the user', async () => {
      // Create a test project first
      await AppDataSource.getRepository(Project).save({
        ...mockProject,
        user: { id: testUser.id },
      });

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get a project by ID', async () => {
      const project = await AppDataSource.getRepository(Project).save({
        ...mockProject,
        user: { id: testUser.id },
      });

      const response = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(project.id);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update a project', async () => {
      const project = await AppDataSource.getRepository(Project).save({
        ...mockProject,
        user: { id: testUser.id },
      });

      const updateData = {
        name: 'Updated Project',
        price: 149.99,
      };

      const response = await request(app)
        .put(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.price).toBe(updateData.price);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete a project', async () => {
      const project = await AppDataSource.getRepository(Project).save({
        ...mockProject,
        user: { id: testUser.id },
      });

      const response = await request(app)
        .delete(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer test-token`)
        .set('X-User-Id', testUser.id);

      expect(response.status).toBe(204);

      // Verify the project is deleted
      const deletedProject = await AppDataSource.getRepository(Project).findOne({
        where: { id: project.id },
      });
      expect(deletedProject).toBeNull();
    });
  });
}); 