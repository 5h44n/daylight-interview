import dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing.' });
    }

    const token = authHeader.split(' ')[1]; // Expected format: "Bearer <token>"
    if (!token) {
      return res.status(401).json({ error: 'Token missing.' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Attach userId to request
    req.userId = decoded.sub;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
