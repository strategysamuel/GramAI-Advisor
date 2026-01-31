// Elasticsearch connection and utilities
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { createElasticsearchClient, checkElasticsearchHealth } from '../config/database';

class ElasticsearchConnection {
  private static instance: ElasticsearchConnection;
  private client: ElasticsearchClient | null = null;

  private constructor() {}

  public static getInstance(): ElasticsearchConnection {
    if (!ElasticsearchConnection.instance) {
      ElasticsearchConnection.instance = new ElasticsearchConnection();
    }
    return ElasticsearchConnection.instance;
  }

  public async connect(): Promise<ElasticsearchClient> {
    if (!this.client) {
      this.client = createElasticsearchClient();
      
      // Test the connection
      const isHealthy = await checkElasticsearchHealth(this.client);
      if (!isHealthy) {
        throw new Error('Failed to connect to Elasticsearch');
      }
      
      console.log('Elasticsearch connected successfully');
    }
    
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log('Elasticsearch disconnected');
    }
  }

  public getClient(): ElasticsearchClient {
    if (!this.client) {
      throw new Error('Elasticsearch not connected. Call connect() first.');
    }
    return this.client;
  }

  // Index management
  public async createIndex(index: string, mapping?: any): Promise<void> {
    const client = this.getClient();
    
    const exists = await client.indices.exists({ index });
    if (!exists) {
      await client.indices.create({
        index,
        body: mapping ? { mappings: mapping } : undefined,
      });
      console.log(`Elasticsearch index '${index}' created`);
    }
  }

  public async deleteIndex(index: string): Promise<void> {
    const client = this.getClient();
    
    const exists = await client.indices.exists({ index });
    if (exists) {
      await client.indices.delete({ index });
      console.log(`Elasticsearch index '${index}' deleted`);
    }
  }

  // Document operations
  public async indexDocument(index: string, id: string, document: any): Promise<void> {
    const client = this.getClient();
    await client.index({
      index,
      id,
      body: document,
    });
  }

  public async getDocument(index: string, id: string): Promise<any> {
    const client = this.getClient();
    try {
      const response = await client.get({
        index,
        id,
      });
      return response.body._source;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  public async updateDocument(index: string, id: string, document: any): Promise<void> {
    const client = this.getClient();
    await client.update({
      index,
      id,
      body: {
        doc: document,
      },
    });
  }

  public async deleteDocument(index: string, id: string): Promise<void> {
    const client = this.getClient();
    await client.delete({
      index,
      id,
    });
  }

  // Search operations
  public async search(index: string, query: any): Promise<any> {
    const client = this.getClient();
    const response = await client.search({
      index,
      body: query,
    });
    return response.body;
  }

  public async searchWithPagination(
    index: string,
    query: any,
    from: number = 0,
    size: number = 10
  ): Promise<any> {
    const client = this.getClient();
    const response = await client.search({
      index,
      body: {
        ...query,
        from,
        size,
      },
    });
    return response.body;
  }

  // Bulk operations
  public async bulk(operations: any[]): Promise<any> {
    const client = this.getClient();
    const response = await client.bulk({
      body: operations,
    });
    return response.body;
  }

  // Aggregations
  public async aggregate(index: string, aggregations: any): Promise<any> {
    const client = this.getClient();
    const response = await client.search({
      index,
      body: {
        size: 0,
        aggs: aggregations,
      },
    });
    return response.body.aggregations;
  }
}

export const elasticsearch = ElasticsearchConnection.getInstance();
export default elasticsearch;