import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, getAuth, clerkClient, User as ClerkUser } from '@clerk/express';
import { UserService } from '../services/user.service';

export const authenticateUser = clerkMiddleware();

export const extractUser = async (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  let clerkUser: ClerkUser;
  if (auth.userId) {
    clerkUser = await clerkClient.users.getUser(auth.userId);
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userService = new UserService();
  const user = await userService.getUserMiddleware(clerkUser);
  
  req.user = {
    id: user.id,
    email: user.email,
    providerUid: user.providerUid,
  };
  next();
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

  next();
};