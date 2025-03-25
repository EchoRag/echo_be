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
  console.log('User:', clerkUser);
  
  const userService = new UserService();
  const user = await userService.getUserMiddleware(clerkUser);
  
  req.user = {
    id: user.id,
    email: user.email,
  };
  next();
};