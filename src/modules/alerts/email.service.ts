import nodemailer from 'nodemailer';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

let lastMockEmail: EmailMessage | null = null;

const mockProvider: EmailProvider = {
  async send(message) {
    lastMockEmail = message;
    logger.info('Mock email notification generated', {
      to: message.to,
      subject: message.subject,
      bodyLength: message.text.length,
    });
  },
};

const smtpProvider: EmailProvider = {
  async send(message) {
    if (!config.email.host || !config.email.port || !config.email.from.address) {
      throw new Error('SMTP email configuration is incomplete');
    }

    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth.user && config.email.auth.pass
        ? { user: config.email.auth.user, pass: config.email.auth.pass }
        : undefined,
    });

    await transporter.sendMail({
      from: config.email.from.address,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  },
};

export const getEmailProvider = (): EmailProvider => {
  if (config.email.provider === 'mock') return mockProvider;
  if (config.email.provider === 'smtp') return smtpProvider;
  throw new Error(`Unsupported email provider: ${config.email.provider}`);
};

export const getLastMockEmail = (): EmailMessage | null => lastMockEmail;
export const clearLastMockEmail = (): void => {
  lastMockEmail = null;
};
