import { User } from '@clerk/clerk-sdk-node';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        user?: User;
      };
      user?: {
        id: string;
        email?: string;
      };
    }
  }
} 