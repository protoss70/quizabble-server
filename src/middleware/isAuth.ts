import { Request, Response, NextFunction } from 'express';
import admin from '../services/firebase';  // Import Firebase Admin SDK

// Middleware to check Firebase ID token
export const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];  // Get token from Authorization header (Bearer <token>)

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    res.locals.user = decodedToken;  // Attach decoded user info to the request object
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};