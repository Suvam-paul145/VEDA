import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { checkRateLimit } from '../services/redis.js';
import { Redis } from '@upstash/redis';

export function rateLimitGuard(redis: Redis) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const allowed = await checkRateLimit(redis, req.userId, 20);
      
      if (!allowed) {
        return res.status(429).json({ 
          error: 'Slow down — learning takes time 😄' 
        });
      }

      next();
    } catch (error: any) {
      console.warn('Rate limit check failed, proceeding without limit:', error.message);
      next();
    }
  };
}
