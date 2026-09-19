process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://admin:postgres_password_change_me@localhost:5432/monitoriq?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-at-least-32-chars';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.FEATURE_AI_ANALYSIS = 'false';
process.env.FEATURE_EMAIL_ALERTS = 'false';
process.env.FEATURE_KAFKA_EVENTS = 'false';
process.env.FEATURE_REDIS_CACHE = 'false';
process.env.AI_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';
