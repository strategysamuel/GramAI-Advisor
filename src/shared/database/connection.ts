// Database connection management
import { Pool } from 'pg';
import { createPostgresPool, checkPostgresHealth } from '../config/database';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<Pool> {
    if (!this.pool) {
      this.pool = createPostgresPool();
      
      // Test the connection
      const isHealthy = await checkPostgresHealth(this.pool);
      if (!isHealthy) {
        throw new Error('Failed to connect to PostgreSQL database');
      }
      
      console.log('PostgreSQL database connected successfully');
    }
    
    return this.pool;
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL database disconnected');
    }
  }

  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const db = DatabaseConnection.getInstance();
export default db;