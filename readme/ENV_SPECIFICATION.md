# MonitorIQ Environment Variables Specification

**Version:** 1.0  
**Date:** August 21, 2026

---

## Environment Files Structure

```
project-root/
├── .env                    # Local development (gitignored)
├── .env.example            # Template (committed to git)
├── .env.test               # Test environment (gitignored)
├── .env.production         # Production (never committed)
└── .env.docker             # Docker Compose environment
```

---

## Complete .env.example Template

```env
# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000
APP_NAME=MonitorIQ
API_VERSION=v1

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# ============================================
# DATABASE CONFIGURATION
# ============================================
# PostgreSQL Connection String
# Format: postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL=postgresql://admin:password@localhost:5432/monitoriq?schema=public

# Connection Pool Settings
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_TIMEOUT=30000

# ============================================
# REDIS CONFIGURATION
# ============================================
# Redis Connection String
# Format: redis://[username]:[password]@HOST:PORT[/DB_NUMBER]
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis Connection Settings
REDIS_CONNECT_TIMEOUT=10000
REDIS_MAX_RETRIES=3

# Cache TTL Settings (seconds)
REDIS_API_STATUS_TTL=120
REDIS_DASHBOARD_CACHE_TTL=30

# ============================================
# KAFKA CONFIGURATION
# ============================================
# Kafka Broker Connection
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=monitoriq-service

# Kafka Topics
KAFKA_INCIDENT_TOPIC=incident-events

# Consumer Group
KAFKA_CONSUMER_GROUP=incident-processor-group

# Kafka Settings
KAFKA_CONNECTION_TIMEOUT=10000
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_RETRY_RETRIES=5
KAFKA_RETRY_INITIAL_RETRY_TIME=300

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
# JWT Secret (MUST be strong random string in production)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# JWT Expiration
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Password Hashing
BCRYPT_SALT_ROUNDS=12

# ============================================
# RATE LIMITING
# ============================================
# General API Rate Limit
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Auth Endpoints Rate Limit (stricter)
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# ============================================
# MONITORING ENGINE CONFIGURATION
# ============================================
# Global monitoring interval (seconds) - fallback if API doesn't specify
MONITORING_DEFAULT_INTERVAL=60

# Maximum concurrent monitoring requests
MONITORING_CONCURRENCY_LIMIT=10

# HTTP Request Timeout (milliseconds)
MONITORING_DEFAULT_TIMEOUT=5000

# Incident Detection Settings
INCIDENT_FAILURE_THRESHOLD=3
INCIDENT_CONSECUTIVE_FAILURES_REQUIRED=3

# ============================================
# AI SERVICE CONFIGURATION
# ============================================
# AI Provider Selection
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.3

# Alternative: Anthropic Claude
# ANTHROPIC_API_KEY=your-anthropic-key
# ANTHROPIC_MODEL=claude-3-sonnet

# AI Service Settings
AI_REQUEST_TIMEOUT=30000
AI_MAX_RETRIES=3
AI_ENABLED=true

# ============================================
# EMAIL SERVICE CONFIGURATION
# ============================================
# Email Provider
EMAIL_PROVIDER=smtp

# SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Email Settings
EMAIL_FROM_NAME=MonitorIQ Alert System
EMAIL_FROM_ADDRESS=alerts@monitoriq.com

# Alert Settings
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=60000

# ============================================
# LOGGING CONFIGURATION
# ============================================
# Log Level: error, warn, info, http, debug
LOG_LEVEL=debug

# Log Format: json, pretty
LOG_FORMAT=pretty

# Enable/Disable Console Logging
LOG_CONSOLE_ENABLED=true

# File Logging
LOG_FILE_ENABLED=false
LOG_FILE_PATH=./logs/app.log

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# ============================================
# SECURITY HEADERS
# ============================================
# Helmet.js security headers (enabled by default)
HELMET_ENABLED=true

# Content Security Policy
CSP_ENABLED=false

# ============================================
# HEALTH CHECK CONFIGURATION
# ============================================
# Enable detailed health checks
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_REDIS_ENABLED=true
HEALTH_CHECK_KAFKA_ENABLED=true
HEALTH_CHECK_DB_ENABLED=true

# ============================================
# FEATURE FLAGS
# ============================================
# Enable/Disable Features
FEATURE_AI_ANALYSIS=true
FEATURE_EMAIL_ALERTS=true
FEATURE_KAFKA_EVENTS=true
FEATURE_REDIS_CACHE=true

# ============================================
# DEVELOPMENT TOOLS
# ============================================
# Enable API Documentation (Swagger)
SWAGGER_ENABLED=true

# Enable Request Logging
REQUEST_LOGGING_ENABLED=true

# Enable Performance Monitoring
PERFORMANCE_MONITORING_ENABLED=false

# ============================================
# TESTING CONFIGURATION
# ============================================
# Test Database (used in .env.test)
TEST_DATABASE_URL=postgresql://admin:password@localhost:5432/monitoriq_test?schema=public

# Disable external services in tests
TEST_DISABLE_KAFKA=true
TEST_DISABLE_EMAIL=true
TEST_DISABLE_AI=true

# ============================================
# DOCKER CONFIGURATION (for docker-compose)
# ============================================
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=postgres_password_change_me
POSTGRES_DB=monitoriq

# Redis
REDIS_PASSWORD_DOCKER=

# Kafka
KAFKA_HEAP_OPTS=-Xmx512m -Xms512m

# ============================================
# PRODUCTION OPTIMIZATION
# ============================================
# Enable clustering (PM2)
CLUSTER_MODE=false
CLUSTER_INSTANCES=4

# Request body size limit
REQUEST_BODY_LIMIT=10kb

# Enable compression
COMPRESSION_ENABLED=true

# ============================================
# MONITORING & OBSERVABILITY
# ============================================
# Application Performance Monitoring
APM_ENABLED=false
APM_SERVICE_NAME=monitoriq-backend
APM_SERVER_URL=

# Metrics Export
METRICS_ENABLED=false
METRICS_PORT=9090

# ============================================
# CRON JOBS CONFIGURATION
# ============================================
# Enable/Disable Monitoring Cron Job
CRON_MONITORING_ENABLED=true

# Cron Schedule (if different from API-specific intervals)
CRON_MONITORING_SCHEDULE=*/1 * * * *

# Cleanup old logs (runs daily at 2 AM)
CRON_CLEANUP_ENABLED=false
CRON_CLEANUP_SCHEDULE=0 2 * * *
CRON_CLEANUP_DAYS=90
```

---

## Environment-Specific Configurations

### Development (.env)
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
LOG_FORMAT=pretty
SWAGGER_ENABLED=true
REQUEST_LOGGING_ENABLED=true
```

### Testing (.env.test)
```env
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://admin:password@localhost:5432/monitoriq_test?schema=public
LOG_LEVEL=error
TEST_DISABLE_KAFKA=true
TEST_DISABLE_EMAIL=true
TEST_DISABLE_AI=true
REDIS_DB=1
```

### Production (.env.production)
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
SWAGGER_ENABLED=false
REQUEST_LOGGING_ENABLED=false
COMPRESSION_ENABLED=true
HELMET_ENABLED=true
CLUSTER_MODE=true
CLUSTER_INSTANCES=4

# Strong secrets (generated)
JWT_SECRET=<64-char-random-hex>
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
```

---

## Validation Rules

### Required Variables (Application won't start without these)

```typescript
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
];
```

### Validation Function

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  
  DATABASE_URL: z.string().url(),
  
  REDIS_URL: z.string().url(),
  REDIS_DB: z.string().transform(Number).default('0'),
  
  KAFKA_BROKER: z.string().min(1),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('24h'),
  
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default('12'),
  
  OPENAI_API_KEY: z.string().optional(),
  AI_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().transform(Number).optional(),
  EMAIL_USER: z.string().email().optional(),
  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  
  MONITORING_DEFAULT_INTERVAL: z.string().transform(Number).default('60'),
  MONITORING_CONCURRENCY_LIMIT: z.string().transform(Number).default('10'),
  
  FRONTEND_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}
```

---

## Usage in Application

```typescript
// src/config/index.ts
import { validateEnv } from './env';

const env = validateEnv();

export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    name: 'MonitorIQ',
    version: env.API_VERSION || 'v1',
  },
  
  database: {
    url: env.DATABASE_URL,
    poolMin: env.DB_POOL_MIN || 5,
    poolMax: env.DB_POOL_MAX || 20,
  },
  
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    ttl: {
      apiStatus: env.REDIS_API_STATUS_TTL || 120,
      dashboard: env.REDIS_DASHBOARD_CACHE_TTL || 30,
    },
  },
  
  kafka: {
    broker: env.KAFKA_BROKER,
    clientId: env.KAFKA_CLIENT_ID || 'monitoriq-service',
    topics: {
      incidents: env.KAFKA_INCIDENT_TOPIC || 'incident-events',
    },
    consumerGroup: env.KAFKA_CONSUMER_GROUP || 'incident-processor-group',
  },
  
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiry: env.JWT_EXPIRY,
    bcryptRounds: env.BCRYPT_SALT_ROUNDS,
  },
  
  monitoring: {
    defaultInterval: env.MONITORING_DEFAULT_INTERVAL,
    concurrencyLimit: env.MONITORING_CONCURRENCY_LIMIT,
    defaultTimeout: env.MONITORING_DEFAULT_TIMEOUT || 5000,
    incidentThreshold: env.INCIDENT_FAILURE_THRESHOLD || 3,
  },
  
  ai: {
    enabled: env.AI_ENABLED,
    provider: env.AI_PROVIDER || 'openai',
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4',
      maxTokens: env.OPENAI_MAX_TOKENS || 500,
    },
  },
  
  email: {
    enabled: env.FEATURE_EMAIL_ALERTS ?? true,
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE === 'true',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
    from: {
      name: env.EMAIL_FROM_NAME || 'MonitorIQ',
      address: env.EMAIL_FROM_ADDRESS || env.EMAIL_USER,
    },
  },
  
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT || 'json',
  },
  
  cors: {
    origin: env.CORS_ORIGIN || env.FRONTEND_URL,
    credentials: env.CORS_CREDENTIALS === 'true',
  },
};
```

---

## Security Best Practices

### 1. Secret Generation

```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate strong password
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
.env.production
.env.*.local
*.pem
*.key
```

### 3. Use Secret Management in Production

**Options:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager
- Doppler
- Infisical

### 4. Rotate Secrets Regularly

- JWT secrets: Every 90 days
- Database passwords: Every 180 days
- API keys: Per provider recommendation

---

## Docker Compose Environment

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      # Use .env file
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKER=kafka:9092
    env_file:
      - .env.docker
```

---

## Environment Loading Order

```typescript
// Load environment variables in main entry point
// src/server.ts or src/index.ts

import 'dotenv/config'; // Load first
import { validateEnv } from './config/env';
import app from './app';

// Validate before starting
const env = validateEnv();

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`✅ MonitorIQ running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
});
```

---

## Troubleshooting

### Common Issues

1. **Missing Required Variables**
   ```
   Error: JWT_SECRET is required
   Solution: Add JWT_SECRET to .env file
   ```

2. **Invalid Database URL**
   ```
   Error: Invalid DATABASE_URL format
   Solution: Check format: postgresql://user:pass@host:port/db
   ```

3. **Redis Connection Failed**
   ```
   Error: Redis connection refused
   Solution: Ensure Redis is running: docker-compose up redis
   ```

4. **Kafka Timeout**
   ```
   Error: Kafka broker not reachable
   Solution: Start Kafka: docker-compose up kafka
   ```

---

## Summary

This environment specification provides:

✅ **Complete variable list** — All configurations documented  
✅ **Type-safe validation** — Zod schema ensures correctness  
✅ **Environment separation** — Dev, test, production configs  
✅ **Security guidelines** — Secret management best practices  
✅ **Sensible defaults** — Works out of the box for development  
✅ **Production-ready** — Optimization and security settings  

**Next:** Project folder structure and dependency list
