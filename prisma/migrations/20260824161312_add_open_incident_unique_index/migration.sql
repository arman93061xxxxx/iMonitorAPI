-- Create partial unique index to guarantee only one OPEN incident per API
-- This prevents duplicate OPEN incidents at the database level
CREATE UNIQUE INDEX IF NOT EXISTS "incidents_apiId_open_unique"
ON "incidents"("apiId")
WHERE "status" = 'OPEN';
