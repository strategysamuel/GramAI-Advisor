// Database health check system
import { db } from './connection';
import { redis } from './redis';
import { elasticsearch } from './elasticsearch';
import { minio } from './minio';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: any;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: Date;
}

class HealthChecker {
  // PostgreSQL health check
  public async checkPostgres(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await db.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'postgresql',
        status: 'healthy',
        responseTime,
        details: {
          connected: true,
          result: result.rows[0]?.health_check === 1,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'postgresql',
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: {
          connected: false,
        },
      };
    }
  }

  // Redis health check
  public async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const client = redis.getClient();
      const pong = await client.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'redis',
        status: 'healthy',
        responseTime,
        details: {
          connected: true,
          ping: pong === 'PONG',
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: {
          connected: false,
        },
      };
    }
  }

  // Elasticsearch health check
  public async checkElasticsearch(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const client = elasticsearch.getClient();
      const health = await client.cluster.health();
      const responseTime = Date.now() - startTime;
      
      const isHealthy = health.body.status === 'green' || health.body.status === 'yellow';
      
      return {
        service: 'elasticsearch',
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        details: {
          connected: true,
          cluster_status: health.body.status,
          number_of_nodes: health.body.number_of_nodes,
          active_shards: health.body.active_shards,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'elasticsearch',
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: {
          connected: false,
        },
      };
    }
  }

  // MinIO health check
  public async checkMinIO(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const client = minio.getClient();
      const buckets = await client.listBuckets();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'minio',
        status: 'healthy',
        responseTime,
        details: {
          connected: true,
          buckets_count: buckets.length,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'minio',
        status: 'unhealthy',
        responseTime,
        error: error.message,
        details: {
          connected: false,
        },
      };
    }
  }

  // Comprehensive system health check
  public async checkSystemHealth(): Promise<SystemHealthStatus> {
    const healthChecks = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkElasticsearch(),
      this.checkMinIO(),
    ]);

    const healthyServices = healthChecks.filter(check => check.status === 'healthy').length;
    const totalServices = healthChecks.length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    
    if (healthyServices === totalServices) {
      overall = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services: healthChecks,
      timestamp: new Date(),
    };
  }

  // Quick health check (for load balancer)
  public async quickHealthCheck(): Promise<boolean> {
    try {
      // Just check if we can connect to the primary database
      await db.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // Detailed health report
  public async getHealthReport(): Promise<string> {
    const health = await this.checkSystemHealth();
    
    let report = `=== GramAI Advisor Health Report ===\n`;
    report += `Overall Status: ${health.overall.toUpperCase()}\n`;
    report += `Timestamp: ${health.timestamp.toISOString()}\n\n`;
    
    report += `Service Details:\n`;
    health.services.forEach(service => {
      report += `  ${service.service}:\n`;
      report += `    Status: ${service.status}\n`;
      report += `    Response Time: ${service.responseTime}ms\n`;
      
      if (service.error) {
        report += `    Error: ${service.error}\n`;
      }
      
      if (service.details) {
        Object.entries(service.details).forEach(([key, value]) => {
          report += `    ${key}: ${value}\n`;
        });
      }
      
      report += `\n`;
    });
    
    return report;
  }
}

export const healthChecker = new HealthChecker();
export default healthChecker;