import { validateEnv } from './env';

const env = validateEnv();

export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    name: 'MonitorIQ',
    version: 'v1',
  },

  database: {
    url: env.DATABASE_URL,
    poolMin: env.DB_POOL_MIN,
    poolMax: env.DB_POOL_MAX,
  },

  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    ttl: {
      apiStatus: env.REDIS_API_STATUS_TTL,
      dashboard: env.REDIS_DASHBOARD_CACHE_TTL,
    },
  },

  kafka: {
    broker: env.KAFKA_BROKER,
    clientId: env.KAFKA_CLIENT_ID,
    topics: {
      incidents: env.KAFKA_INCIDENT_TOPIC,
    },
    consumerGroup: env.KAFKA_CONSUMER_GROUP,
  },

  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiry: env.JWT_EXPIRY,
    bcryptRounds: env.BCRYPT_SALT_ROUNDS,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    authMaxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  },

  monitoring: {
    defaultInterval: env.MONITORING_DEFAULT_INTERVAL,
    concurrencyLimit: env.MONITORING_CONCURRENCY_LIMIT,
    defaultTimeout: env.MONITORING_DEFAULT_TIMEOUT,
    incidentThreshold: env.INCIDENT_FAILURE_THRESHOLD,
  },

  ai: {
    enabled: env.AI_ENABLED,
    provider: env.AI_PROVIDER,
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      maxTokens: env.OPENAI_MAX_TOKENS,
      temperature: env.OPENAI_TEMPERATURE,
    },
  },

  email: {
    enabled: env.FEATURE_EMAIL_ALERTS,
    provider: env.EMAIL_PROVIDER,
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
    from: {
      name: env.EMAIL_FROM_NAME,
      address: env.EMAIL_FROM_ADDRESS || env.EMAIL_USER,
    },
    to: env.ALERT_EMAIL_TO,
  },

  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },

  cors: {
    origin: env.CORS_ORIGIN || env.FRONTEND_URL,
    credentials: env.CORS_CREDENTIALS,
  },

  features: {
    aiAnalysis: env.FEATURE_AI_ANALYSIS,
    emailAlerts: env.FEATURE_EMAIL_ALERTS,
    kafkaEvents: env.FEATURE_KAFKA_EVENTS,
    redisCache: env.FEATURE_REDIS_CACHE,
  },
};

export default config;
