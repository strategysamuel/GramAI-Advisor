// Database configuration utilities
import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { appConfig } from './index';

// PostgreSQL connection pool
export const createPostgresPool = (): Pool => {
  const poolConfig: PoolConfig = {
    connectionString: appConfig.database.postgres.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  return new Pool(poolConfig);
};

// Redis client
export const createRedisClient = (): RedisClientType => {
  const client = createClient({
    url: appConfig.database.redis.url,
    password: appConfig.database.redis.password,
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  return client;
};

// Elasticsearch client
export const createElasticsearchClient = (): ElasticsearchClient => {
  return new ElasticsearchClient({
    node: appConfig.database.elasticsearch.url,
    requestTimeout: 30000,
    pingTimeout: 3000,
  });
};

// Database health check functions
export const checkPostgresHealth = async (pool: Pool): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    return false;
  }
};

export const checkRedisHealth = async (client: RedisClientType): Promise<boolean> => {
  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

export const checkElasticsearchHealth = async (client: ElasticsearchClient): Promise<boolean> => {
  try {
    const response = await client.cluster.health();
    return response.status === 'green' || response.status === 'yellow';
  } catch (error) {
    console.error('Elasticsearch health check failed:', error);
    return false;
  }
};