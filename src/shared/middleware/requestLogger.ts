// Request/Response logging middleware
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '../config';

export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
}

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  headers: Record<string, any>;
  query: Record<string, any>;
  body?: any;
  timestamp: string;
}

interface ResponseLogData {
  requestId: string;
  statusCode: number;
  responseTime: number;
  contentLength?: number;
  timestamp: string;
}

class RequestLogger {
  private logLevel: string;
  private sensitiveHeaders: string[];
  private sensitiveFields: string[];

  constructor() {
    this.logLevel = appConfig.logging.level;
    this.sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    this.sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'otp',
      'pin',
    ];
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    
    this.sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        
        Object.keys(obj).forEach(key => {
          const lowerKey = key.toLowerCase();
          const isSensitive = this.sensitiveFields.some(field => 
            lowerKey.includes(field)
          );
          
          if (isSensitive) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(obj[key]);
          }
        });
        
        return result;
      }
      
      return obj;
    };
    
    return sanitizeObject(sanitized);
  }

  private shouldLogBody(req: Request): boolean {
    // Don't log body for file uploads or large payloads
    const contentType = req.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      return false;
    }
    
    if (contentType.includes('application/octet-stream')) {
      return false;
    }
    
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 1024 * 1024) { // 1MB
      return false;
    }
    
    return true;
  }

  public requestMiddleware = (req: LoggedRequest, res: Response, next: NextFunction): void => {
    // Generate unique request ID
    req.requestId = uuidv4();
    req.startTime = Date.now();
    
    // Add request ID to response headers
    res.set('X-Request-ID', req.requestId);
    
    // Log request
    if (this.logLevel === 'debug' || appConfig.development.enableDebug) {
      const requestLog: RequestLogData = {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userId: (req as any).user?.id,
        headers: this.sanitizeHeaders(req.headers),
        query: req.query,
        body: this.shouldLogBody(req) ? this.sanitizeBody(req.body) : '[BODY_NOT_LOGGED]',
        timestamp: new Date().toISOString(),
      };
      
      console.log('📥 REQUEST:', JSON.stringify(requestLog, null, 2));
    } else {
      console.log(`📥 ${req.method} ${req.originalUrl} - ${req.requestId}`);
    }
    
    next();
  };

  public responseMiddleware = (req: LoggedRequest, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override res.send
    res.send = function(body: any) {
      logResponse.call(this, body);
      return originalSend.call(this, body);
    };
    
    // Override res.json
    res.json = function(body: any) {
      logResponse.call(this, body);
      return originalJson.call(this, body);
    };
    
    const logResponse = function(this: Response, body: any) {
      if (req.requestId && req.startTime) {
        const responseTime = Date.now() - req.startTime;
        const contentLength = Buffer.isBuffer(body) ? body.length : 
                             typeof body === 'string' ? Buffer.byteLength(body) :
                             JSON.stringify(body).length;
        
        if (appConfig.logging.level === 'debug' || appConfig.development.enableDebug) {
          const responseLog: ResponseLogData = {
            requestId: req.requestId,
            statusCode: this.statusCode,
            responseTime,
            contentLength,
            timestamp: new Date().toISOString(),
          };
          
          console.log('📤 RESPONSE:', JSON.stringify(responseLog, null, 2));
          
          // Log response body for errors or debug mode
          if (this.statusCode >= 400) {
            console.log('📤 RESPONSE BODY:', JSON.stringify(body, null, 2));
          }
        } else {
          const status = this.statusCode >= 400 ? '❌' : '✅';
          console.log(`📤 ${status} ${this.statusCode} - ${responseTime}ms - ${req.requestId}`);
        }
      }
    };
    
    next();
  };
}

const requestLogger = new RequestLogger();

// Export middleware functions
export const logRequest = requestLogger.requestMiddleware;
export const logResponse = requestLogger.responseMiddleware;

// Combined middleware
export const requestLoggerMiddleware = [
  requestLogger.requestMiddleware,
  requestLogger.responseMiddleware,
];

// Default export
export { requestLogger };

export default requestLogger;