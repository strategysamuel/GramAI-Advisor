// Rate limiting middleware
import { Request, Response, NextFunction } from 'express';
import { redis } from '../database/redis';
import { appConfig } from '../config';
import { ApiResponse } from '../types';

interface RateLimitInfo {
  count: number;
  resetTime: number;
  remaining: number;
}

class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private keyGenerator: (req: Request) => string;

  constructor(
    windowMs: number = appConfig.rateLimit.windowMs,
    maxRequests: number = appConfig.rateLimit.maxRequests,
    keyGenerator?: (req: Request) => string
  ) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyGenerator = keyGenerator || this.defaultKeyGenerator;
  }

  private defaultKeyGenerator(req: Request): string {
    // Use IP address as default key
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `rate_limit:${ip}`;
  }

  private async getRateLimitInfo(key: string): Promise<RateLimitInfo> {
    try {
      const client = redis.getClient();
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Use Redis sorted set to track requests in the time window
      const pipeline = client.multi();
      
      // Remove expired entries
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      // Add current request
      pipeline.zAdd(key, { score: now, value: now.toString() });
      
      // Count requests in current window
      pipeline.zCard(key);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(this.windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results?.[2] as number || 0;
      
      const resetTime = now + this.windowMs;
      const remaining = Math.max(0, this.maxRequests - count);

      return {
        count,
        resetTime,
        remaining,
      };
    } catch (error) {
      // If Redis is unavailable, allow the request but log the error
      console.error('Rate limiter Redis error:', error);
      return {
        count: 0,
        resetTime: Date.now() + this.windowMs,
        remaining: this.maxRequests,
      };
    }
  }

  public async middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = this.keyGenerator(req);
      const rateLimitInfo = await this.getRateLimitInfo(key);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
        'X-RateLimit-Window': this.windowMs.toString(),
      });

      if (rateLimitInfo.count > this.maxRequests) {
        const response: ApiResponse = {
          success: false,
          message: 'Rate limit exceeded',
          error: `Too many requests. Limit: ${this.maxRequests} per ${this.windowMs / 1000} seconds`,
        };

        res.status(429).json(response);
        return;
      }

      next();
    } catch (error: any) {
      console.error('Rate limiter error:', error);
      // If rate limiter fails, allow the request to proceed
      next();
    }
  }
}

// Create different rate limiters for different use cases
export const generalRateLimiter = new RateLimiter();

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = new RateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `auth_rate_limit:${ip}`;
  }
);

// Rate limiter for file uploads
export const uploadRateLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads per hour
  (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `upload_rate_limit:${ip}`;
  }
);

// Rate limiter for expensive operations (AI/ML processing)
export const aiProcessingRateLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 AI requests per hour
  (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ai_rate_limit:${ip}`;
  }
);

// User-specific rate limiter (requires authentication)
export const createUserRateLimiter = (windowMs: number, maxRequests: number) => {
  return new RateLimiter(
    windowMs,
    maxRequests,
    (req: any) => {
      const userId = req.user?.id || req.ip || 'unknown';
      return `user_rate_limit:${userId}`;
    }
  );
};

// Export the default rate limiter middleware
export const rateLimiter = (req: Request, res: Response, next: NextFunction): Promise<void> => {
  return generalRateLimiter.middleware(req, res, next);
};

export default RateLimiter;