// Redis cache management
import { RedisClientType } from 'redis';
import { createRedisClient, checkRedisHealth } from '../config/database';

class RedisConnection {
  private static instance: RedisConnection;
  private client: RedisClientType | null = null;

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createRedisClient();
      await this.client.connect();
      
      // Test the connection
      const isHealthy = await checkRedisHealth(this.client);
      if (!isHealthy) {
        throw new Error('Failed to connect to Redis cache');
      }
      
      console.log('Redis cache connected successfully');
    }
    
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      console.log('Redis cache disconnected');
    }
  }

  public getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  // Cache utility methods
  public async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  }

  public async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  public async expire(key: string, ttl: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, ttl);
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  // Hash operations
  public async hGet(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hGet(key, field);
  }

  public async hSet(key: string, field: string, value: string): Promise<void> {
    const client = this.getClient();
    await client.hSet(key, field, value);
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hGetAll(key);
  }

  // List operations
  public async lPush(key: string, ...values: string[]): Promise<void> {
    const client = this.getClient();
    await client.lPush(key, values);
  }

  public async rPop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.rPop(key);
  }

  public async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lRange(key, start, stop);
  }
}

export const redis = RedisConnection.getInstance();
export default redis;