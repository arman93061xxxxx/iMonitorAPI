-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('EMAIL', 'SLACK', 'WEBHOOK', 'SMS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "description" TEXT,
    "monitoringInterval" INTEGER NOT NULL DEFAULT 60,
    "timeout" INTEGER NOT NULL DEFAULT 5000,
    "expectedStatusCode" INTEGER DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_logs" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusCode" INTEGER,
    "responseTime" INTEGER,
    "isAvailable" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "isTimeout" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT,
    "possibleCause" TEXT,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_logs" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "monitoringLogId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "possibleCause" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" "Severity" NOT NULL,
    "recommendations" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "apis_userId_idx" ON "apis"("userId");

-- CreateIndex
CREATE INDEX "apis_isActive_idx" ON "apis"("isActive");

-- CreateIndex
CREATE INDEX "apis_userId_isActive_idx" ON "apis"("userId", "isActive");

-- CreateIndex
CREATE INDEX "monitoring_logs_apiId_timestamp_idx" ON "monitoring_logs"("apiId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "monitoring_logs_timestamp_idx" ON "monitoring_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "monitoring_logs_isAvailable_idx" ON "monitoring_logs"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incidentNumber_key" ON "incidents"("incidentNumber");

-- CreateIndex
CREATE INDEX "incidents_apiId_status_idx" ON "incidents"("apiId", "status");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "incidents_detectedAt_idx" ON "incidents"("detectedAt" DESC);

-- CreateIndex
CREATE INDEX "incident_logs_incidentId_idx" ON "incident_logs"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_logs_incidentId_monitoringLogId_key" ON "incident_logs"("incidentId", "monitoringLogId");

-- CreateIndex
CREATE INDEX "ai_analyses_incidentId_idx" ON "ai_analyses"("incidentId");

-- CreateIndex
CREATE INDEX "alerts_incidentId_idx" ON "alerts"("incidentId");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- AddForeignKey
ALTER TABLE "apis" ADD CONSTRAINT "apis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_logs" ADD CONSTRAINT "monitoring_logs_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "apis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "apis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_monitoringLogId_fkey" FOREIGN KEY ("monitoringLogId") REFERENCES "monitoring_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
