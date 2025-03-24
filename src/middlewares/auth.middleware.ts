import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '@clerk/express';

export const authenticateUser = requireAuth();

export const extractUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.auth) {
    req.user = {
      id: req.auth.userId,
      email: req.auth.user?.emailAddresses[0]?.emailAddress,
    };
  }
  next();
}; 