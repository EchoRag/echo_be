import { Request, Response, NextFunction } from 'express';
import { ProxyServerService } from '../services/proxyserver.service';
import { AppError } from '../utils/app-error';
import axios from 'axios';

export class ProxyServerController {
  private proxyServerService = new ProxyServerService();

  registerServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { llmServerUrl } = req.body;
      if (!llmServerUrl) {
        throw new AppError(400, 'llmServerUrl is required');
      }

      const config = await this.proxyServerService.registerServer(llmServerUrl);
      res.json(config);
    } catch (error) {
      next(error);
    }
  };

  startServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recaptchaToken = req.headers['x-recaptcha-token'];
      if (!recaptchaToken) {
        throw new AppError(400, 'reCAPTCHA token is required');
      }

      try {
        const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
        const client = new RecaptchaEnterpriseServiceClient();
        
        const projectPath = client.projectPath(process.env.GOOGLE_CLOUD_PROJECT_ID);
        const assessment = {
          event: {
            token: recaptchaToken,
            siteKey: process.env.RECAPTCHA_SITE_KEY,
            expectedAction: 'start_server'
          }
        };

        const [response] = await client.createAssessment({
          parent: projectPath,
          assessment: assessment
        });

        if (response.riskAnalysis.score < 0.5) {
          throw new AppError(400, 'reCAPTCHA verification failed');
        }
      } catch (error) {
        throw new AppError(400, 'Failed to verify reCAPTCHA token');
      }

      // Call the webhook to start the server
      try {
        const url = `${process.env.WEBHOOK_URL}`;
        await axios.post(`${url}`);

        res.json({
          status: 'success',
          message: 'Server start triggered'
        });
      } catch (error) {
        throw new AppError(500, `Failed to trigger server start: ${error.message}`);
      }
    } catch (error) {
      next(error);
    }
  };
} 