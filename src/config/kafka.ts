import { Kafka, Producer } from 'kafkajs';
import { config } from './index';
import { logger } from '../utils/logger';

let kafkaProducer: Producer | null = null;

export const createKafkaProducer = (): Producer => {
  if (kafkaProducer) {
    return kafkaProducer;
  }

  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: [config.kafka.broker],
  });

  kafkaProducer = kafka.producer({
    allowAutoTopicCreation: true,
  });

  return kafkaProducer;
};

export const getKafkaProducer = (): Producer | null => {
  return kafkaProducer;
};

export const publishIncidentEvent = async (
  event: string,
  incidentId: string,
  apiId: string
): Promise<void> => {
  try {
    const producer = getKafkaProducer();
    if (!producer) {
      logger.warn('Kafka producer not initialized, skipping event publish', { event, incidentId, apiId });
      return;
    }

    const payload = {
      event,
      incidentId,
      apiId,
      timestamp: new Date().toISOString(),
    };

    await producer.send({
      topic: config.kafka.topics.incidents,
      messages: [
        {
          key: incidentId,
          value: JSON.stringify(payload),
        },
      ],
    });

    logger.info('Kafka event published', { event, incidentId, apiId });
  } catch (error) {
    logger.warn('Failed to publish Kafka event', { event, incidentId, apiId, error });
  }
};

export const connectKafkaProducer = async (): Promise<void> => {
  try {
    const producer = createKafkaProducer();
    await producer.connect();
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Failed to connect Kafka producer', { error });
    throw error;
  }
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  try {
    const producer = getKafkaProducer();
    if (producer) {
      await producer.disconnect();
      kafkaProducer = null;
      logger.info('Kafka producer disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting Kafka producer', { error });
  }
};
