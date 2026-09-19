ALTER TABLE "ai_analyses"
ADD COLUMN "impact" TEXT NOT NULL DEFAULT 'Impact not yet determined';

CREATE UNIQUE INDEX "ai_analyses_incidentId_key" ON "ai_analyses"("incidentId");
