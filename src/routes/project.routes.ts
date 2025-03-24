import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticateUser, extractUser } from '../middlewares/auth.middleware';

const router = Router();
const projectController = new ProjectController();

// Apply authentication middleware to all routes
router.use(authenticateUser);
router.use(extractUser);

// Project routes
router.post('/', projectController.createProject);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router; 