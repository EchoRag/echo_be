import { Request, Response } from 'express';
import { ProxyServerService } from '../services/proxyserver.service';

export class ProxyServerController {
  private proxyServerService: ProxyServerService;

  constructor() {
    this.proxyServerService = new ProxyServerService();
  }

  async registerServer(req: Request, res: Response): Promise<void> {
    try {
      const { llmServerUrl } = req.body;

      if (!llmServerUrl) {
        res.status(400).json({ error: 'llmServerUrl is required' });
        return;
      }

      const config = await this.proxyServerService.registerServer(llmServerUrl);
      res.status(200).json(config);
    } catch (error) {
      console.error('Error registering server:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  
} 