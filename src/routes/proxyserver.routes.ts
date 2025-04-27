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
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Service authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/register', authenticateService, (req, res, next) => proxyServerController.registerServer(req, res, next));

/**
 * @swagger
 * /api/v1/proxy-server/start:
 *   post:
 *     tags:
 *       - Proxy Server
 *     summary: Start the LLM server
 *     description: Trigger the LLM server to start via webhook. Requires reCAPTCHA verification and user authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-recaptcha-token
 *         required: true
 *         schema:
 *           type: string
 *         description: reCAPTCHA token for verification
 *     responses:
 *       200:
 *         description: Server start triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Server start triggered"
 *       400:
 *         description: Bad request - reCAPTCHA token is required or verification failed
 *       401:
 *         description: Unauthorized - User authentication required
 *       404:
 *         description: No active LLM server configuration found
 *       500:
 *         description: Internal server error
 */
router.post('/start', authenticateUser, extractUser, (req, res, next) => proxyServerController.startServer(req, res, next));

export default router; 