// API-related type definitions

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  targetService: string;
  authRequired: boolean;
  rateLimit?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

export interface AuthProvider {
  name: string;
  type: 'jwt' | 'oauth' | 'basic';
  config: Record<string, any>;
}