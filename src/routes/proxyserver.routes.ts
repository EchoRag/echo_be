import { Router } from 'express';
import { ProxyServerController } from '../controllers/proxyserver.controller';
import { authenticateService, authenticateUser, extractUser } from '../middlewares/auth.middleware';

const router = Router();
const proxyServerController = new ProxyServerController();

/**
 * @swagger
 * /api/v1/proxy-server/register:
 *   post:
 *     tags:
 *       - Proxy Server
 *     summary: Register a new LLM server
 *     description: Register a new LLM server or update an existing one
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - llmServerUrl
 *             properties:
 *               llmServerUrl:
 *                 type: string
 *                 description: URL of the LLM server to register
 *     responses:
 *       200:
 *         description: Server registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EchoConfig'
 *       400:
 *         description: Bad request - llmServerUrl is required
 *       500:
 *         description: Internal server error
 */
router.post('/register', authenticateService, (req, res) => proxyServerController.registerServer(req, res));


export default router; 