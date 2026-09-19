import prisma from '../../config/database';
import { publishIncidentEvent } from '../../config/kafka';
import { logger } from '../../utils/logger';
import { KAFKA_EVENTS, INCIDENT_STATUS } from '../../utils/constants';
import { CheckResult } from '../monitoring/monitoring.service';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { analyzeIncident } from '../ai';
import { notifyIncident } from '../alerts';

export const processCheckResult = async (
  apiId: string,
  result: CheckResult,
  monitoringLogId: string
): Promise<void> => {
  try {
    if (result.isAvailable) {
      await resolveOpenIncident(apiId, monitoringLogId);
    } else {
      await handleFailure(apiId, result, monitoringLogId);
    }
  } catch (error) {
    logger.error('Incident processing failed', { apiId, error });
  }
};

const handleFailure = async (
  apiId: string,
  result: CheckResult,
  monitoringLogId: string
): Promise<void> => {
  const openIncident = await prisma.incident.findFirst({
    where: {
      apiId,
      status: INCIDENT_STATUS.OPEN,
    },
  });

  if (openIncident) {
    const updatedIncident = await prisma.$transaction(async (tx) => {
      await tx.incidentLog.create({
        data: {
          incidentId: openIncident.id,
          monitoringLogId,
          event: 'FAILURE_DETECTED',
        },
      });

      return tx.incident.update({
        where: { id: openIncident.id },
        data: {
          failureCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    });

    logger.info('Failure recorded for existing incident', {
      incidentId: openIncident.id,
      apiId,
      failureCount: updatedIncident.failureCount,
    });
    await analyzeIncident(openIncident.id);
    return;
  }

  try {
    const incident = await prisma.$transaction(async (tx) => {
      const inc = await tx.incident.create({
        data: {
          apiId,
          status: INCIDENT_STATUS.OPEN,
          startedAt: new Date(),
          failureCount: 1,
          summary: result.errorMessage ?? 'API monitoring failure detected',
          incidentNumber: `INC-${Date.now()}-${uuidv4().slice(0, 8)}`,
        },
      });

      await tx.incidentLog.create({
        data: {
          incidentId: inc.id,
          monitoringLogId,
          event: 'INCIDENT_OPENED',
        },
      });

      return inc;
    });

    await publishIncidentEvent(KAFKA_EVENTS.INCIDENT_OPENED, incident.id, apiId);
    await analyzeIncident(incident.id);
    await notifyIncident(incident.id, 'INCIDENT_OPENED');

    logger.info('New incident created', { incidentId: incident.id, apiId });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const newOpenIncident = await prisma.incident.findFirst({
        where: {
          apiId,
          status: INCIDENT_STATUS.OPEN,
        },
      });

      if (newOpenIncident) {
        await prisma.$transaction(async (tx) => {
          await tx.incidentLog.create({
            data: {
              incidentId: newOpenIncident.id,
              monitoringLogId,
              event: 'FAILURE_DETECTED',
            },
          });

          await tx.incident.update({
            where: { id: newOpenIncident.id },
            data: {
              failureCount: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        });

        logger.info('Race condition handled, failure recorded for concurrently created incident', {
          incidentId: newOpenIncident.id,
          apiId,
        });
        await analyzeIncident(newOpenIncident.id);
      }
    } else {
      throw error;
    }
  }
};

const resolveOpenIncident = async (
  apiId: string,
  monitoringLogId: string
): Promise<void> => {
  const openIncident = await prisma.incident.findFirst({
    where: {
      apiId,
      status: INCIDENT_STATUS.OPEN,
    },
  });

  if (!openIncident) {
    return;
  }

  await prisma.$transaction([
    prisma.incident.update({
      where: { id: openIncident.id },
      data: {
        status: INCIDENT_STATUS.RESOLVED,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    }),
    prisma.incidentLog.create({
      data: {
        incidentId: openIncident.id,
        monitoringLogId,
        event: 'INCIDENT_RESOLVED',
      },
    }),
  ]);

  await publishIncidentEvent(KAFKA_EVENTS.INCIDENT_RESOLVED, openIncident.id, apiId);
  await analyzeIncident(openIncident.id);
  await notifyIncident(openIncident.id, 'INCIDENT_RESOLVED');

  logger.info('Incident resolved', { incidentId: openIncident.id, apiId });
};
