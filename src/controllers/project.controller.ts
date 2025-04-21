import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';

export class ProjectController {
  private projectService = new ProjectService();

  /**
   * @swagger
   * /api/v1/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - description
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *               metadata:
   *                 type: object
   */
  createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body) {
        const project = await this.projectService.createProject({
          ...req.body,
          user: { id: req.user?.id },
        });
        res.status(201).json(project);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/projects:
   *   get:
   *     summary: Get all projects for the current user
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   */
  getAllProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if(req.user && req.user.id){
        const projects = await this.projectService.getAllProjects(req.user?.id || '');
        res.json(projects);
      }else{
        res.status(401).send({message: 'Unauthorized'});
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/projects/{id}:
   *   get:
   *     summary: Get a project by ID
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  getProjectById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await this.projectService.getProjectById(req.params.id);
      res.json(project);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/projects/{id}:
   *   put:
   *     summary: Update a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               price:
   *                 type: number
   *               imageUrl:
   *                 type: string
   *               metadata:
   *                 type: object
   */
  updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await this.projectService.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/projects/{id}:
   *   delete:
   *     summary: Delete a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.projectService.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
} 