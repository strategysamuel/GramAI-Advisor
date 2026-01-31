// API Gateway Server
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { appConfig } from '../../shared/config';
import { healthChecker } from '../../shared/database/health';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { requestLoggerMiddleware } from '../../shared/middleware/requestLogger';
import { rateLimiter } from '../../shared/middleware/rateLimiter';
import { authMiddleware } from '../../shared/middleware/auth';
import { ApiResponse } from '../../shared/types';

class ApiGatewayServer {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = appConfig.app.port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: appConfig.security.cors.origin,
      credentials: appConfig.security.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (appConfig.app.env !== 'test') {
      this.app.use(morgan(appConfig.logging.format));
    }
    this.app.use(requestLoggerMiddleware);

    // Rate limiting
    this.app.use(rateLimiter);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const isHealthy = await healthChecker.quickHealthCheck();
        
        if (isHealthy) {
          const response: ApiResponse = {
            success: true,
            message: 'Service is healthy',
            data: {
              status: 'healthy',
              timestamp: new Date().toISOString(),
              version: appConfig.app.version,
            },
          };
          res.status(200).json(response);
        } else {
          const response: ApiResponse = {
            success: false,
            message: 'Service is unhealthy',
            error: 'Database connection failed',
          };
          res.status(503).json(response);
        }
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: 'Health check failed',
          error: error.message,
        };
        res.status(503).json(response);
      }
    });

    // Detailed health check endpoint
    this.app.get('/health/detailed', async (req: Request, res: Response) => {
      try {
        const healthStatus = await healthChecker.checkSystemHealth();
        
        const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                          healthStatus.overall === 'degraded' ? 200 : 503;
        
        const response: ApiResponse = {
          success: healthStatus.overall !== 'unhealthy',
          message: `System is ${healthStatus.overall}`,
          data: healthStatus,
        };
        
        res.status(statusCode).json(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: 'Detailed health check failed',
          error: error.message,
        };
        res.status(503).json(response);
      }
    });

    // API version info
    this.app.get('/api/v1/info', (req: Request, res: Response) => {
      const response: ApiResponse = {
        success: true,
        message: 'GramAI Advisor API',
        data: {
          name: appConfig.app.name,
          version: appConfig.app.version,
          environment: appConfig.app.env,
          timestamp: new Date().toISOString(),
        },
      };
      res.json(response);
    });

    // Profile service routes
    this.app.use('/api/v1/profiles', this.createServiceProxy('profile'));
    
    // NLP service routes
    this.app.use('/api/v1/nlp', this.createServiceProxy('nlp'));
    
    // Speech service routes
    this.app.use('/api/v1/speech', this.createServiceProxy('speech'));
    
    // Advisory service routes
    this.app.use('/api/v1/advisory', authMiddleware, this.createServiceProxy('advisory'));
    
    // Visual analysis service routes
    this.app.use('/api/v1/visual', authMiddleware, this.createServiceProxy('visual-analysis'));
    
    // Soil analysis service routes
    this.app.use('/api/v1/soil', authMiddleware, this.createServiceProxy('soil-analysis'));
    
    // Market intelligence service routes
    this.app.use('/api/v1/market', authMiddleware, this.createServiceProxy('market-intelligence'));
    
    // Scheme discovery service routes
    this.app.use('/api/v1/schemes', authMiddleware, this.createServiceProxy('scheme-discovery'));
    
    // Finance service routes
    this.app.use('/api/v1/finance', authMiddleware, this.createServiceProxy('finance'));
    
    // Document service routes
    this.app.use('/api/v1/documents', authMiddleware, this.createServiceProxy('document'));

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      const response: ApiResponse = {
        success: false,
        message: 'Endpoint not found',
        error: `Cannot ${req.method} ${req.originalUrl}`,
      };
      res.status(404).json(response);
    });
  }

  private createServiceProxy(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      // For now, return a placeholder response
      // In a real microservices setup, this would proxy to the actual service
      const response: ApiResponse = {
        success: true,
        message: `${serviceName} service endpoint`,
        data: {
          service: serviceName,
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body,
          timestamp: new Date().toISOString(),
        },
      };
      
      res.json(response);
    };
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connections
      console.log('Initializing database connections...');
      
      // Start the server
      this.app.listen(this.port, () => {
        console.log(`🚀 API Gateway server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`📖 API Info: http://localhost:${this.port}/api/v1/info`);
        console.log(`🌍 Environment: ${appConfig.app.env}`);
      });
      
    } catch (error) {
      console.error('Failed to start API Gateway server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default ApiGatewayServer;