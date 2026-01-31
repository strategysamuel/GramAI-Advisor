// Main application entry point
import { appConfig } from './shared/config';
import ApiGatewayService from './services/api-gateway';
import { db } from './shared/database/connection';
import { redis } from './shared/database/redis';
import { elasticsearch } from './shared/database/elasticsearch';
import { minio } from './shared/database/minio';

async function startApplication(): Promise<void> {
  try {
    console.log(`🚀 Starting ${appConfig.app.name} v${appConfig.app.version}`);
    console.log(`🌍 Environment: ${appConfig.app.env}`);

    // Initialize database connections
    console.log('📊 Initializing database connections...');
    
    try {
      await db.connect();
      console.log('✅ PostgreSQL connected');
    } catch (error) {
      console.warn('⚠️  PostgreSQL connection failed:', error);
    }

    try {
      await redis.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.warn('⚠️  Redis connection failed:', error);
    }

    try {
      await elasticsearch.connect();
      console.log('✅ Elasticsearch connected');
    } catch (error) {
      console.warn('⚠️  Elasticsearch connection failed:', error);
    }

    try {
      await minio.connect();
      console.log('✅ MinIO connected');
    } catch (error) {
      console.warn('⚠️  MinIO connection failed:', error);
    }

    // Start API Gateway
    const apiGateway = new ApiGatewayService();
    await apiGateway.start();

  } catch (error) {
    console.error('💥 Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  
  try {
    await db.disconnect();
    await redis.disconnect();
    await elasticsearch.disconnect();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  
  process.exit(0);
});

// Start the application
if (require.main === module) {
  startApplication();
}

export default startApplication;