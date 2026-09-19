CREATE TYPE "AlertEvent" AS ENUM ('INCIDENT_OPENED', 'INCIDENT_RESOLVED');

ALTER TABLE "alerts"
ADD COLUMN "event" "AlertEvent" NOT NULL DEFAULT 'INCIDENT_OPENED';

CREATE UNIQUE INDEX "alerts_incidentId_event_key" ON "alerts"("incidentId", "event");
