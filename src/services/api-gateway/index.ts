// API Gateway Service
// Handles request routing, authentication, rate limiting, and API versioning

import ApiGatewayServer from './server';

export class ApiGatewayService {
  private server: ApiGatewayServer;

  constructor() {
    console.log('API Gateway Service initialized');
    this.server = new ApiGatewayServer();
  }

  public async start(): Promise<void> {
    await this.server.start();
  }

  public getServer(): ApiGatewayServer {
    return this.server;
  }
}

export default ApiGatewayService;