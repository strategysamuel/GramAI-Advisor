// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config';
import { ApiResponse } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
    role: string;
    iat: number;
    exp: number;
  };
}

export interface JWTPayload {
  id: string;
  phoneNumber: string;
  role: string;
}

class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshExpiresIn: string;

  constructor() {
    this.jwtSecret = appConfig.security.jwt.secret;
    this.jwtExpiresIn = appConfig.security.jwt.expiresIn;
    this.refreshExpiresIn = appConfig.security.jwt.refreshExpiresIn;
  }

  // Generate access token
  public generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: appConfig.app.name,
      audience: 'gramai-users',
    });
  }

  // Generate refresh token
  public generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: appConfig.app.name,
      audience: 'gramai-refresh',
    });
  }

  // Verify access token
  public verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: appConfig.app.name,
        audience: 'gramai-users',
      }) as JWTPayload;
      
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Verify refresh token
  public verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: appConfig.app.name,
        audience: 'gramai-refresh',
      }) as JWTPayload;
      
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  // Generate token pair
  public generateTokenPair(payload: JWTPayload): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  // Refresh access token
  public refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } {
    const payload = this.verifyRefreshToken(refreshToken);
    
    // Remove JWT specific fields
    const { iat, exp, ...userPayload } = payload as any;
    
    return this.generateTokenPair(userPayload);
  }
}

export const authService = new AuthService();

// Authentication middleware
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        error: 'No authorization header provided',
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        error: 'No token provided',
      };
      res.status(401).json(response);
      return;
    }

    const decoded = authService.verifyAccessToken(token);
    req.user = decoded as any;
    
    next();
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: 'Authentication failed',
      error: error.message,
    };
    res.status(401).json(response);
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      
      if (token) {
        const decoded = authService.verifyAccessToken(token);
        req.user = decoded as any;
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors in optional middleware
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    if (!roles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        message: 'Insufficient permissions',
        error: `Required roles: ${roles.join(', ')}`,
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export default authService;