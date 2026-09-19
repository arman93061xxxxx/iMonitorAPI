import app from './app';
import { config } from './config';
import prisma from './config/database';
import { logger } from './utils/logger';
import { createRedisClient } from './config/redis';
import { connectKafkaProducer } from './config/kafka';
import { startScheduler } from './modules/monitoring';

const server = app.listen(config.app.port, () => {
  logger.info(`${config.app.name} listening on port ${config.app.port} (${config.app.env})`);
});

try {
  createRedisClient();
  startScheduler();
} catch (error) {
  logger.error('Failed to initialize monitoring infrastructure', { error });
}

const initKafka = async () => {
  try {
    await connectKafkaProducer();
  } catch (error) {
    logger.error('Failed to connect Kafka producer', { error });
  }
};

void initKafka();

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

export default server;
