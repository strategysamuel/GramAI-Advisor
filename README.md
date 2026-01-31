# GramAI Advisor

AI-powered rural decision support platform for Indian farmers.

## Overview

GramAI Advisor is a comprehensive agricultural advisory system that empowers farmers with data-driven insights while maintaining simplicity and accessibility. The platform provides intelligent crop planning, land allocation, government scheme discovery, financial enablement, and market intelligence for low-literacy, low-connectivity rural users across India.

## Features

- **Multilingual Support**: Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, and English
- **Voice Interface**: Speech-to-text and text-to-speech capabilities
- **Visual Land Analysis**: Photo-based land assessment and recommendations
- **Soil Report Processing**: Automated soil analysis and recommendations
- **Crop Advisory**: AI-powered crop recommendations based on multiple factors
- **Market Intelligence**: Real-time market prices and trade guidance
- **Government Schemes**: Discovery and application assistance for relevant schemes
- **Financial Services**: Loan eligibility assessment and project report generation
- **Document Processing**: KYC and document validation assistance

## Architecture

The platform follows a microservices architecture with the following components:

- **API Gateway**: Request routing, authentication, and rate limiting
- **Profile Service**: Farmer profile and preference management
- **NLP Service**: Language processing and translation
- **Speech Service**: Voice interaction capabilities
- **Advisory Engine**: Crop recommendations and farming advice
- **Visual Analysis**: Land photo processing and analysis
- **Soil Analysis**: Soil report interpretation
- **Market Intelligence**: Price data and market insights
- **Scheme Discovery**: Government scheme recommendations
- **Finance Service**: Loan and financial services
- **Document Service**: Document processing and validation

## Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL, Redis, Elasticsearch
- **File Storage**: MinIO (S3-compatible)
- **Message Queue**: Apache Kafka
- **Containerization**: Docker, Docker Compose
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gramai-advisor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the databases**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI Spec: `http://localhost:3000/api-docs.json`

### Health Check

Check if the system is running properly:
```bash
curl http://localhost:3000/health
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm start` - Start production server
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run migrate` - Run database migrations
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

### Project Structure

```
src/
├── services/           # Microservices
│   ├── api-gateway/   # API Gateway service
│   ├── profile/       # Profile management
│   ├── nlp/          # Natural language processing
│   ├── speech/       # Speech services
│   ├── advisory/     # Agricultural advisory
│   ├── visual-analysis/ # Visual analysis
│   ├── soil-analysis/   # Soil analysis
│   ├── market-intelligence/ # Market data
│   ├── scheme-discovery/    # Government schemes
│   ├── finance/      # Financial services
│   └── document/     # Document processing
├── shared/            # Shared utilities
│   ├── config/       # Configuration management
│   ├── database/     # Database connections
│   ├── middleware/   # Express middleware
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
└── tests/            # Test files
    ├── unit/         # Unit tests
    ├── integration/  # Integration tests
    └── e2e/          # End-to-end tests
```

### Database Schema

The application uses PostgreSQL with the following schemas:
- `profiles` - Farmer profiles and preferences
- `advisory` - Crop recommendations and advice
- `market` - Market prices and trade data
- `finance` - Loan applications and financial data
- `documents` - Document storage and processing
- `schemes` - Government scheme information

### Testing

Run the test suite:
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Code Quality

The project uses ESLint and Prettier for code quality:
```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Deployment

### Docker Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Environment Variables

Key environment variables to configure:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `POSTGRES_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_URL` - Elasticsearch URL
- `JWT_SECRET` - JWT signing secret
- `IMD_WEATHER_API_KEY` - IMD Weather API key
- `ENAM_API_KEY` - e-NAM API key
- `AGMARKNET_API_KEY` - AGMARKNET API key

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - User logout

### Profiles
- `GET /api/v1/profiles/me` - Get current user profile
- `PUT /api/v1/profiles/me` - Update user profile
- `POST /api/v1/profiles` - Create new profile

### Advisory
- `GET /api/v1/advisory/recommendations` - Get crop recommendations
- `POST /api/v1/advisory/land-allocation` - Get land allocation suggestions

### Market Intelligence
- `GET /api/v1/market/prices` - Get market prices
- `GET /api/v1/market/trends` - Get price trends

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Ensure code passes linting and formatting checks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Email: support@gramai.com
- Documentation: [API Docs](http://localhost:3000/api-docs)
- Issues: [GitHub Issues](https://github.com/gramai/advisor/issues)

## Acknowledgments

- Indian Meteorological Department (IMD) for weather data
- e-NAM and AGMARKNET for market price data
- Government of India for agricultural scheme information