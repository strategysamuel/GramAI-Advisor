// Swagger/OpenAPI documentation setup
import { Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { appConfig } from '../config';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GramAI Advisor API',
      version: appConfig.app.version,
      description: 'AI-powered rural decision support platform for Indian farmers',
      contact: {
        name: 'GramAI Team',
        email: 'support@gramai.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${appConfig.app.port}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.gramai.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            message: {
              type: 'string',
              description: 'Human-readable message',
            },
            data: {
              type: 'object',
              description: 'Response data (present on success)',
            },
            error: {
              type: 'string',
              description: 'Error message (present on failure)',
            },
          },
          required: ['success'],
        },
        FarmerProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique farmer identifier',
            },
            personalInfo: {
              $ref: '#/components/schemas/PersonalInfo',
            },
            location: {
              $ref: '#/components/schemas/LocationData',
            },
            landDetails: {
              $ref: '#/components/schemas/LandDetails',
            },
            preferences: {
              $ref: '#/components/schemas/FarmingPreferences',
            },
            riskTolerance: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PersonalInfo: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Farmer full name',
            },
            age: {
              type: 'integer',
              minimum: 1,
              maximum: 150,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
            },
            education: {
              type: 'string',
              enum: ['none', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate'],
            },
            experience: {
              type: 'integer',
              minimum: 0,
              description: 'Years of farming experience',
            },
            primaryLanguage: {
              type: 'string',
              enum: ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'en'],
            },
            phoneNumber: {
              type: 'string',
              pattern: '^[+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$',
            },
            alternateContact: {
              type: 'string',
              pattern: '^[+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$',
            },
          },
          required: ['name', 'age', 'gender', 'primaryLanguage', 'phoneNumber'],
        },
        LocationData: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'State name',
            },
            district: {
              type: 'string',
              description: 'District name',
            },
            block: {
              type: 'string',
              description: 'Block name',
            },
            village: {
              type: 'string',
              description: 'Village name',
            },
            pincode: {
              type: 'string',
              pattern: '^[0-9]{6}$',
            },
            coordinates: {
              $ref: '#/components/schemas/GeoCoordinates',
            },
          },
          required: ['state', 'district', 'block', 'pincode'],
        },
        GeoCoordinates: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
            },
          },
          required: ['latitude', 'longitude'],
        },
        LandDetails: {
          type: 'object',
          properties: {
            totalArea: {
              type: 'number',
              minimum: 0,
              description: 'Total land area in acres',
            },
            ownedArea: {
              type: 'number',
              minimum: 0,
              description: 'Owned land area in acres',
            },
            leasedArea: {
              type: 'number',
              minimum: 0,
              description: 'Leased land area in acres',
            },
            irrigatedArea: {
              type: 'number',
              minimum: 0,
              description: 'Irrigated land area in acres',
            },
            soilTypes: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Types of soil present',
            },
            waterSources: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Available water sources',
            },
            currentCrops: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Currently grown crops',
            },
            infrastructure: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Available infrastructure',
            },
          },
          required: ['totalArea'],
        },
        FarmingPreferences: {
          type: 'object',
          properties: {
            cropsOfInterest: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            farmingMethods: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            integratedFarming: {
              type: 'boolean',
            },
            organicFarming: {
              type: 'boolean',
            },
            technologyAdoption: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
            },
            marketPreferences: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Detailed error information',
            },
          },
          required: ['success', 'message'],
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health and status endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Profiles',
        description: 'Farmer profile management',
      },
      {
        name: 'Advisory',
        description: 'Agricultural advisory services',
      },
      {
        name: 'Market Intelligence',
        description: 'Market prices and trade information',
      },
      {
        name: 'Schemes',
        description: 'Government scheme discovery',
      },
      {
        name: 'Finance',
        description: 'Financial services and loan applications',
      },
      {
        name: 'Documents',
        description: 'Document processing and management',
      },
      {
        name: 'Visual Analysis',
        description: 'Land photo and visual analysis',
      },
      {
        name: 'Soil Analysis',
        description: 'Soil report processing and analysis',
      },
    ],
  },
  apis: [
    './src/services/**/*.ts',
    './src/shared/middleware/*.ts',
  ],
};

export const setupSwagger = (app: Application): void => {
  if (!appConfig.development.enableSwagger) {
    return;
  }

  const specs = swaggerJsdoc(swaggerOptions);
  
  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c5530 }
    `,
    customSiteTitle: 'GramAI Advisor API Documentation',
  };

  // Serve Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📚 API Documentation available at: http://localhost:${appConfig.app.port}/api-docs`);
};

export default setupSwagger;