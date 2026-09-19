import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import authRoutes from './modules/auth/auth.routes';
import apiRoutes from './modules/api/api.routes';
import historyRoutes from './modules/history/history.routes';
import path from 'path';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(requestLogger);

app.get(['/health', '/api/v1/health'], (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'MonitorIQ',
  });
});

app.use(express.static(path.join(process.cwd(), 'public')));
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/apis', apiRoutes);
app.use('/api/v1', historyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
