import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, getAuth, clerkClient, User as ClerkUser } from '@clerk/express';
import { UserService } from '../services/user.service';

export const authenticateUser = clerkMiddleware();

export const extractUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    let clerkUser: ClerkUser;
    
    if (!auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      clerkUser = await clerkClient.users.getUser(auth.userId);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userService = new UserService();
    try {
      const user = await userService.getUserMiddleware(clerkUser);
      
      req.user = {
        id: user.id,
        email: user.email,
        providerUid: user.providerUid,
      };
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const authenticateService = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Compare with environment variable or secure token store
  if (token !== process.env.SERVICE_TOKEN) {
    return res.status(401).json({ error: 'Invalid service token' });
  }

  return next();
};