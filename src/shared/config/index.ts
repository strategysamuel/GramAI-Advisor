// Configuration management system
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env') });

export interface AppConfig {
  app: {
    name: string;
    version: string;
    env: string;
    port: number;
  };
  database: {
    postgres: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      url: string;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      url: string;
    };
    elasticsearch: {
      host: string;
      port: number;
      url: string;
    };
  };
  storage: {
    minio: {
      endpoint: string;
      port: number;
      accessKey: string;
      secretKey: string;
      bucketName: string;
    };
  };
  messaging: {
    kafka: {
      brokers: string[];
      clientId: string;
      groupId: string;
    };
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
    bcrypt: {
      rounds: number;
    };
    cors: {
      origin: string;
      credentials: boolean;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  externalApis: {
    imdWeather: {
      apiKey: string;
    };
    enam: {
      apiKey: string;
    };
    agmarknet: {
      apiKey: string;
    };
  };
  logging: {
    level: string;
    format: string;
  };
  fileUpload: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  monitoring: {
    enableMetrics: boolean;
    metricsPort: number;
  };
  development: {
    enableSwagger: boolean;
    enableDebug: boolean;
  };
}

const getConfig = (): AppConfig => {
  return {
    app: {
      name: process.env['APP_NAME'] || 'GramAI Advisor',
      version: process.env['APP_VERSION'] || '1.0.0',
      env: process.env['NODE_ENV'] || 'development',
      port: parseInt(process.env['PORT'] || '3000', 10),
    },
    database: {
      postgres: {
        host: process.env['POSTGRES_HOST'] || 'localhost',
        port: parseInt(process.env['POSTGRES_PORT'] || '5432', 10),
        database: process.env['POSTGRES_DB'] || 'gramai_advisor',
        username: process.env['POSTGRES_USER'] || 'gramai_user',
        password: process.env['POSTGRES_PASSWORD'] || 'gramai_password',
        url: process.env['POSTGRES_URL'] || 'postgresql://gramai_user:gramai_password@localhost:5432/gramai_advisor',
      },
      redis: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
        password: process.env['REDIS_PASSWORD'],
        url: process.env['REDIS_URL'] || 'redis://localhost:6379',
      },
      elasticsearch: {
        host: process.env['ELASTICSEARCH_HOST'] || 'localhost',
        port: parseInt(process.env['ELASTICSEARCH_PORT'] || '9200', 10),
        url: process.env['ELASTICSEARCH_URL'] || 'http://localhost:9200',
      },
    },
    storage: {
      minio: {
        endpoint: process.env['MINIO_ENDPOINT'] || 'localhost',
        port: parseInt(process.env['MINIO_PORT'] || '9000', 10),
        accessKey: process.env['MINIO_ACCESS_KEY'] || 'gramai_minio',
        secretKey: process.env['MINIO_SECRET_KEY'] || 'gramai_minio_password',
        bucketName: process.env['MINIO_BUCKET_NAME'] || 'gramai-files',
      },
    },
    messaging: {
      kafka: {
        brokers: (process.env['KAFKA_BROKERS'] || 'localhost:9092').split(','),
        clientId: process.env['KAFKA_CLIENT_ID'] || 'gramai-advisor',
        groupId: process.env['KAFKA_GROUP_ID'] || 'gramai-group',
      },
    },
    security: {
      jwt: {
        secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-this-in-production',
        expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
        refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
      },
      bcrypt: {
        rounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
      },
      cors: {
        origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
        credentials: process.env['CORS_CREDENTIALS'] === 'true',
      },
    },
    rateLimit: {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
      maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
    },
    externalApis: {
      imdWeather: {
        apiKey: process.env['IMD_WEATHER_API_KEY'] || '',
      },
      enam: {
        apiKey: process.env['ENAM_API_KEY'] || '',
      },
      agmarknet: {
        apiKey: process.env['AGMARKNET_API_KEY'] || '',
      },
    },
    logging: {
      level: process.env['LOG_LEVEL'] || 'info',
      format: process.env['LOG_FORMAT'] || 'combined',
    },
    fileUpload: {
      maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '10485760', 10), // 10MB
      allowedFileTypes: (process.env['ALLOWED_FILE_TYPES'] || 'jpg,jpeg,png,pdf,doc,docx').split(','),
    },
    monitoring: {
      enableMetrics: process.env['ENABLE_METRICS'] === 'true',
      metricsPort: parseInt(process.env['METRICS_PORT'] || '9090', 10),
    },
    development: {
      enableSwagger: process.env['ENABLE_SWAGGER'] === 'true',
      enableDebug: process.env['ENABLE_DEBUG'] === 'true',
    },
  };
};

// Validate required environment variables
const validateConfig = (config: AppConfig): void => {
  const requiredFields = [
    'app.name',
    'app.port',
    'database.postgres.url',
    'security.jwt.secret',
  ];

  for (const field of requiredFields) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
    if (!value) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }

  // Validate JWT secret in production
  if (config.app.env === 'production' && config.security.jwt.secret === 'your-super-secret-jwt-key-change-this-in-production') {
    throw new Error('JWT_SECRET must be changed in production environment');
  }
};

// Export configuration
export const appConfig = getConfig();

// Validate configuration on import
validateConfig(appConfig);

export default appConfig;