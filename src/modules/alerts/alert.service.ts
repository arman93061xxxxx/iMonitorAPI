import prisma from '../../config/database';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { getEmailProvider, type EmailMessage } from './email.service';
import { sanitizeAnalysisUrl } from '../ai';
import type { AlertEvent, Incident } from '@prisma/client';

const sanitizeText = (value: string | null | undefined): string => {
  if (!value) return '';
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[jwt redacted]');
};

const buildMessage = async (incident: Incident, event: AlertEvent, recipient: string): Promise<EmailMessage> => {
  const api = await prisma.api.findUniqueOrThrow({ where: { id: incident.apiId } });
  const analysis = await prisma.aIAnalysis.findUnique({ where: { incidentId: incident.id } });
  const apiUrl = sanitizeAnalysisUrl(api.url);
  const isResolution = event === 'INCIDENT_RESOLVED';
  const subject = isResolution
    ? `[MonitorIQ] Incident resolved: ${api.name}`
    : `[MonitorIQ] Incident opened: ${api.name}`;

  const lines = [
    'MonitorIQ',
    `Status: ${isResolution ? 'RESOLVED' : 'OPEN'}`,
    `API: ${api.name}`,
    `URL: ${apiUrl}`,
    `Method: ${api.method}`,
    `Incident ID: ${incident.id}`,
    `Opened: ${incident.startedAt.toISOString()}`,
  ];

  if (isResolution && incident.resolvedAt) {
    lines.push(`Resolved: ${incident.resolvedAt.toISOString()}`);
    lines.push(`Duration (ms): ${incident.resolvedAt.getTime() - incident.startedAt.getTime()}`);
  }

  if (!isResolution && analysis) {
    lines.push(`Severity: ${analysis.severity}`);
    lines.push(`Summary: ${sanitizeText(analysis.summary)}`);
    lines.push(`Probable cause: ${sanitizeText(analysis.possibleCause)}`);
    lines.push(`Impact: ${sanitizeText(analysis.impact)}`);
  }

  return { to: recipient, subject, text: lines.join('\n') };
};

export const notifyIncident = async (incidentId: string, event: AlertEvent): Promise<void> => {
  if (!config.email.enabled) {
    logger.info('Email alerts disabled', { incidentId, event });
    return;
  }

  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) {
    logger.warn('Cannot alert for missing incident', { incidentId, event });
    return;
  }

  let alert;
  try {
    alert = await prisma.alert.create({
      data: {
        incidentId,
        event,
        type: 'EMAIL',
        recipient: config.email.to,
        status: 'PENDING',
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      logger.info('Duplicate incident alert suppressed', { incidentId, event });
      return;
    }
    logger.error('Failed to persist incident alert', { incidentId, event, error });
    return;
  }

  try {
    const message = await buildMessage(incident, event, alert.recipient);
    await getEmailProvider().send(message);
    await prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    logger.info('Incident email notification sent', { alertId: alert.id, incidentId, event });
  } catch (error) {
    await prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Email provider failed' },
    }).catch(updateError => logger.error('Failed to record email alert failure', { alertId: alert.id, updateError }));
    logger.error('Incident email notification failed', { alertId: alert.id, incidentId, event, error });
  }
};

export { buildMessage as buildAlertEmail, sanitizeText as sanitizeAlertText };
