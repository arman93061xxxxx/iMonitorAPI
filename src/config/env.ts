import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),

  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MIN: z.string().transform(Number).default('5'),
  DB_POOL_MAX: z.string().transform(Number).default('20'),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_API_STATUS_TTL: z.string().transform(Number).default('120'),
  REDIS_DASHBOARD_CACHE_TTL: z.string().transform(Number).default('30'),

  // Kafka
  KAFKA_BROKER: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default('monitoriq-service'),
  KAFKA_INCIDENT_TOPIC: z.string().default('incident-events'),
  KAFKA_CONSUMER_GROUP: z.string().default('incident-processor-group'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('24h'),
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default('12'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('5'),

  // Monitoring
  MONITORING_DEFAULT_INTERVAL: z.string().transform(Number).default('60'),
  MONITORING_CONCURRENCY_LIMIT: z.string().transform(Number).default('10'),
  MONITORING_DEFAULT_TIMEOUT: z.string().transform(Number).default('5000'),
  INCIDENT_FAILURE_THRESHOLD: z.string().transform(Number).default('3'),

  // AI
  AI_PROVIDER: z.string().default('mock'),
  AI_ENABLED: z.string().transform(val => val === 'true').default('true'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).default('500'),
  OPENAI_TEMPERATURE: z.string().transform(Number).default('0.3'),

  // Email
  EMAIL_PROVIDER: z.string().default('mock'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().transform(Number).optional(),
  EMAIL_SECURE: z.string().transform(val => val === 'true').default('false'),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('MonitorIQ Alert System'),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  ALERT_EMAIL_TO: z.string().email().default('alerts@example.invalid'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // CORS
  FRONTEND_URL: z.string().url(),
  CORS_ORIGIN: z.string().optional(),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),

  // Feature Flags
  FEATURE_AI_ANALYSIS: z.string().transform(val => val === 'true').default('true'),
  FEATURE_EMAIL_ALERTS: z.string().transform(val => val === 'true').default('true'),
  FEATURE_KAFKA_EVENTS: z.string().transform(val => val === 'true').default('true'),
  FEATURE_REDIS_CACHE: z.string().transform(val => val === 'true').default('true'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}
