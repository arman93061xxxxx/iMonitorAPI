import morgan from 'morgan';
import { logger } from '../utils/logger';

export const requestLogger = morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
});

export default requestLogger;
