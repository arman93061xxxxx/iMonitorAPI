# MonitorIQ Database Design

**Version:** 1.0  
**Date:** August 21, 2026  
**Database:** PostgreSQL 15+  
**ORM:** Prisma

---

## Entity-Relationship Diagram

```
┌─────────────────┐
│      User       │
│─────────────────│
│ PK id           │
│    name         │
│ UK email        │
│    passwordHash │
│    role         │
│    createdAt    │
│    updatedAt    │
└────────┬────────┘
         │
         │ 1:N (owns)
         │
         ▼
┌─────────────────┐
│      Api        │
│─────────────────│
│ PK id           │
│    name         │
│    url          │
│    method       │
│    description  │
│    interval     │
│    timeout      │
│    isActive     │
│ FK userId       │
│    createdAt    │
│    updatedAt    │
└────┬─────┬──────┘
     │     │
     │     │ 1:N (monitored by)
     │     ▼
     │  ┌─────────────────┐
     │  │ MonitoringLog   │
     │  │─────────────────│
     │  │ PK id           │
     │  │ FK apiId        │
     │  │    timestamp    │
     │  │    statusCode   │
     │  │    responseTime │
     │  │    isAvailable  │
     │  │    errorMessage │
     │  │    isTimeout    │
     │  │    createdAt    │
     │  └────────┬────────┘
     │           │
     │           │ N:M (via IncidentLog)
     │           │
     │ 1:N       ▼
     │  ┌─────────────────┐
     └─►│    Incident     │◄──────────┐
        │─────────────────│            │
        │ PK id           │            │
        │ UK incidentNum  │            │
        │ FK apiId        │            │
        │    status       │            │
        │    severity     │            │
        │    startedAt    │            │
        │    detectedAt   │            │
        │    resolvedAt   │            │
        │    failureCount │            │
        │    summary      │            │
        │    createdAt    │            │
        │    updatedAt    │            │
        └────┬─────┬──────┘            │
             │     │                   │
             │     │ 1:N               │
             │     ▼                   │
             │  ┌─────────────────┐   │
             │  │  IncidentLog    │   │
             │  │─────────────────│   │
             │  │ PK id           │   │
             │  │ FK incidentId   │───┘
             │  │ FK monitorLogId │
             │  │    createdAt    │
             │  └─────────────────┘
             │
             │ 1:N
             ├────────────────────┐
             │                    │
             ▼                    ▼
      ┌─────────────┐     ┌─────────────┐
      │ AIAnalysis  │     │   Alert     │
      │─────────────│     │─────────────│
      │ PK id       │     │ PK id       │
      │ FK incident │     │ FK incident │
      │    summary  │     │    type     │
      │    cause    │     │    recipient│
      │    confidence│    │    status   │
      │    severity │     │    sentAt   │
      │    recomm.  │     │    error    │
      │    model    │     │    retry    │
      │    createdAt│     │    createdAt│
      └─────────────┘     └─────────────┘
```

---

## Detailed Schema Specification

### 1. User Table

**Purpose:** Store user accounts with authentication credentials

```sql
CREATE TABLE "User" (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role         VARCHAR(50) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    createdAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON "User"(email);
```

**Constraints:**
- Email must be unique (enforced by unique constraint)
- Email must be valid format (application-level validation)
- Password must be hashed with bcrypt (never stored as plaintext)
- Role must be either USER or ADMIN

**Sample Data:**
```sql
INSERT INTO "User" (id, name, email, passwordHash, role) VALUES
('a1b2c3d4-...', 'John Doe', 'john@example.com', '$2b$12$...', 'USER'),
('e5f6g7h8-...', 'Admin User', 'admin@monitoriq.com', '$2b$12$...', 'ADMIN');
```

---

### 2. Api Table

**Purpose:** Store registered APIs to be monitored

```sql
CREATE TABLE "Api" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    url                 TEXT NOT NULL,
    method              VARCHAR(10) NOT NULL DEFAULT 'GET' 
                        CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    description         TEXT,
    monitoringInterval  INTEGER NOT NULL DEFAULT 60 CHECK (monitoringInterval >= 10),
    timeout             INTEGER NOT NULL DEFAULT 5000 CHECK (timeout > 0),
    expectedStatusCode  INTEGER DEFAULT 200 CHECK (expectedStatusCode >= 100 AND expectedStatusCode < 600),
    isActive            BOOLEAN NOT NULL DEFAULT true,
    
    userId              UUID NOT NULL,
    
    createdAt           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_api_user FOREIGN KEY (userId) 
        REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_userId ON "Api"(userId);
CREATE INDEX idx_api_isActive ON "Api"(isActive);
CREATE INDEX idx_api_monitoringInterval ON "Api"(monitoringInterval);
CREATE INDEX idx_api_userId_isActive ON "Api"(userId, isActive);
```

**Constraints:**
- URL must be valid HTTP/HTTPS URL (application-level validation)
- monitoringInterval minimum 10 seconds (prevent excessive monitoring)
- timeout must be positive
- expectedStatusCode must be valid HTTP status code (100-599)
- Cascade delete: deleting a user deletes all their APIs

**Sample Data:**
```sql
INSERT INTO "Api" (id, name, url, method, description, monitoringInterval, timeout, userId) VALUES
(
    'api-uuid-1',
    'Payment Gateway API',
    'https://api.payment.com/health',
    'GET',
    'Main payment processing service health check',
    60,
    5000,
    'user-uuid-1'
),
(
    'api-uuid-2',
    'Notification Service',
    'https://notifications.example.com/status',
    'GET',
    'Email and SMS notification service',
    120,
    3000,
    'user-uuid-1'
);
```

---

### 3. MonitoringLog Table

**Purpose:** Record every monitoring check attempt (historical data)

```sql
CREATE TABLE "MonitoringLog" (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apiId        UUID NOT NULL,
    
    timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statusCode   INTEGER CHECK (statusCode >= 100 AND statusCode < 600),
    responseTime INTEGER CHECK (responseTime >= 0), -- milliseconds
    isAvailable  BOOLEAN NOT NULL,
    errorMessage TEXT,
    isTimeout    BOOLEAN NOT NULL DEFAULT false,
    
    createdAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_monitoringlog_api FOREIGN KEY (apiId) 
        REFERENCES "Api"(id) ON DELETE CASCADE
);

CREATE INDEX idx_monitoringlog_apiId_timestamp ON "MonitoringLog"(apiId, timestamp DESC);
CREATE INDEX idx_monitoringlog_timestamp ON "MonitoringLog"(timestamp DESC);
CREATE INDEX idx_monitoringlog_isAvailable ON "MonitoringLog"(isAvailable);
CREATE INDEX idx_monitoringlog_apiId_isAvailable ON "MonitoringLog"(apiId, isAvailable);
```

**Constraints:**
- statusCode can be NULL (for network errors where no response received)
- responseTime can be NULL (for timeouts/network errors)
- isAvailable is always set (true = success, false = failure)
- timestamp indexed for time-series queries
- Cascade delete: deleting an API deletes all monitoring logs

**Data Retention Strategy:**
```sql
-- Optional: Archive old logs after 90 days
-- DELETE FROM "MonitoringLog" WHERE timestamp < NOW() - INTERVAL '90 days';
```

**Sample Data:**
```sql
INSERT INTO "MonitoringLog" (id, apiId, timestamp, statusCode, responseTime, isAvailable, errorMessage, isTimeout) VALUES
('log-1', 'api-uuid-1', '2026-08-21 10:00:00', 200, 180, true, NULL, false),
('log-2', 'api-uuid-1', '2026-08-21 10:01:00', 200, 195, true, NULL, false),
('log-3', 'api-uuid-1', '2026-08-21 10:02:00', 503, 5200, false, 'Service Unavailable', false),
('log-4', 'api-uuid-1', '2026-08-21 10:03:00', NULL, NULL, false, 'ETIMEDOUT', true);
```

---

### 4. Incident Table

**Purpose:** Track API failures as incidents with lifecycle management

```sql
CREATE TABLE "Incident" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidentNumber  VARCHAR(50) NOT NULL UNIQUE, -- INC-001, INC-002, etc.
    
    apiId           UUID NOT NULL,
    
    status          VARCHAR(50) NOT NULL DEFAULT 'OPEN' 
                    CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
    severity        VARCHAR(50) NOT NULL DEFAULT 'MEDIUM' 
                    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    startedAt       TIMESTAMP NOT NULL,
    detectedAt      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvedAt      TIMESTAMP,
    
    failureCount    INTEGER NOT NULL DEFAULT 1 CHECK (failureCount > 0),
    
    summary         TEXT,
    possibleCause   TEXT,
    recommendation  TEXT,
    
    createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_incident_api FOREIGN KEY (apiId) 
        REFERENCES "Api"(id) ON DELETE CASCADE,
    CONSTRAINT chk_resolved_timestamp 
        CHECK ((status = 'RESOLVED' AND resolvedAt IS NOT NULL) OR 
               (status != 'RESOLVED' AND resolvedAt IS NULL))
);

CREATE INDEX idx_incident_apiId_status ON "Incident"(apiId, status);
CREATE INDEX idx_incident_status ON "Incident"(status);
CREATE INDEX idx_incident_severity ON "Incident"(severity);
CREATE INDEX idx_incident_detectedAt ON "Incident"(detectedAt DESC);
CREATE INDEX idx_incident_incidentNumber ON "Incident"(incidentNumber);

-- Sequence for incident numbers
CREATE SEQUENCE incident_number_seq START 1;
```

**Incident Number Generation:**
```sql
-- In application code:
-- incidentNumber = 'INC-' + padStart(nextval('incident_number_seq'), 6, '0')
-- Result: INC-000001, INC-000002, etc.
```

**Constraints:**
- Only one OPEN incident per API at a time (application-level enforcement)
- resolvedAt must be set only when status is RESOLVED
- startedAt should be <= detectedAt (first failure <= detection time)
- failureCount tracks consecutive failures

**Sample Data:**
```sql
INSERT INTO "Incident" (id, incidentNumber, apiId, status, severity, startedAt, detectedAt, resolvedAt, failureCount) VALUES
(
    'inc-uuid-1',
    'INC-000001',
    'api-uuid-1',
    'RESOLVED',
    'HIGH',
    '2026-08-21 10:02:00',
    '2026-08-21 10:05:00',
    '2026-08-21 11:30:00',
    12
),
(
    'inc-uuid-2',
    'INC-000002',
    'api-uuid-2',
    'OPEN',
    'MEDIUM',
    '2026-08-21 14:00:00',
    '2026-08-21 14:03:00',
    NULL,
    3
);
```

---

### 5. IncidentLog Table (Junction Table)

**Purpose:** Link incidents to specific monitoring logs that contributed to the incident

```sql
CREATE TABLE "IncidentLog" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    incidentId      UUID NOT NULL,
    monitoringLogId UUID NOT NULL,
    
    createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_incidentlog_incident FOREIGN KEY (incidentId) 
        REFERENCES "Incident"(id) ON DELETE CASCADE,
    CONSTRAINT fk_incidentlog_monitoringlog FOREIGN KEY (monitoringLogId) 
        REFERENCES "MonitoringLog"(id) ON DELETE CASCADE,
    CONSTRAINT uq_incident_monitoringlog UNIQUE (incidentId, monitoringLogId)
);

CREATE INDEX idx_incidentlog_incidentId ON "IncidentLog"(incidentId);
CREATE INDEX idx_incidentlog_monitoringLogId ON "IncidentLog"(monitoringLogId);
```

**Purpose:**
- Trace which monitoring checks are related to an incident
- Provides historical context for incident analysis
- Enables timeline reconstruction

**Sample Data:**
```sql
INSERT INTO "IncidentLog" (incidentId, monitoringLogId) VALUES
('inc-uuid-1', 'log-3'),
('inc-uuid-1', 'log-4'),
('inc-uuid-1', 'log-5');
```

---

### 6. AIAnalysis Table

**Purpose:** Store AI-generated incident analysis results

```sql
CREATE TABLE "AIAnalysis" (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    incidentId       UUID NOT NULL,
    
    summary          TEXT NOT NULL,
    possibleCause    TEXT NOT NULL,
    confidence       NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    severity         VARCHAR(50) NOT NULL 
                     CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    recommendations  JSONB NOT NULL, -- Array of recommendation strings
    
    model            VARCHAR(100) NOT NULL, -- e.g., "gpt-4", "claude-3"
    promptTokens     INTEGER,
    completionTokens INTEGER,
    
    createdAt        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_aianalysis_incident FOREIGN KEY (incidentId) 
        REFERENCES "Incident"(id) ON DELETE CASCADE
);

CREATE INDEX idx_aianalysis_incidentId ON "AIAnalysis"(incidentId);
CREATE INDEX idx_aianalysis_createdAt ON "AIAnalysis"(createdAt DESC);
```

**JSONB Structure for recommendations:**
```json
[
  "Check server application logs for errors",
  "Verify database connectivity and query performance",
  "Review recent deployments or configuration changes",
  "Monitor server resource utilization (CPU, memory)"
]
```

**Sample Data:**
```sql
INSERT INTO "AIAnalysis" (id, incidentId, summary, possibleCause, confidence, severity, recommendations, model) VALUES
(
    'ai-uuid-1',
    'inc-uuid-1',
    'The Payment Gateway API experienced a critical service disruption lasting 88 minutes with 12 consecutive failures.',
    'The API is likely experiencing an internal server-side failure, possibly due to database connectivity issues or resource exhaustion.',
    0.85,
    'HIGH',
    '["Check server application logs", "Verify database connectivity", "Review recent deployments", "Check dependent services"]'::jsonb,
    'gpt-4'
);
```

---

### 7. Alert Table

**Purpose:** Track alert notifications sent for incidents

```sql
CREATE TABLE "Alert" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    incidentId  UUID NOT NULL,
    
    type        VARCHAR(50) NOT NULL DEFAULT 'EMAIL' 
                CHECK (type IN ('EMAIL', 'SLACK', 'WEBHOOK', 'SMS')),
    recipient   VARCHAR(255) NOT NULL,
    status      VARCHAR(50) NOT NULL DEFAULT 'PENDING' 
                CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRY')),
    
    sentAt      TIMESTAMP,
    error       TEXT,
    retryCount  INTEGER NOT NULL DEFAULT 0 CHECK (retryCount >= 0),
    
    createdAt   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_alert_incident FOREIGN KEY (incidentId) 
        REFERENCES "Incident"(id) ON DELETE CASCADE,
    CONSTRAINT chk_sent_timestamp 
        CHECK ((status = 'SENT' AND sentAt IS NOT NULL) OR 
               (status != 'SENT'))
);

CREATE INDEX idx_alert_incidentId ON "Alert"(incidentId);
CREATE INDEX idx_alert_status ON "Alert"(status);
CREATE INDEX idx_alert_createdAt ON "Alert"(createdAt DESC);
CREATE INDEX idx_alert_status_retry ON "Alert"(status, retryCount) WHERE status IN ('FAILED', 'RETRY');
```

**Constraints:**
- sentAt must be set when status is SENT
- retryCount tracks retry attempts for failed alerts
- One incident can have multiple alerts (e.g., initial alert, escalation, resolution)

**Sample Data:**
```sql
INSERT INTO "Alert" (id, incidentId, type, recipient, status, sentAt, retryCount) VALUES
(
    'alert-uuid-1',
    'inc-uuid-1',
    'EMAIL',
    'john@example.com',
    'SENT',
    '2026-08-21 10:06:00',
    0
),
(
    'alert-uuid-2',
    'inc-uuid-2',
    'EMAIL',
    'admin@example.com',
    'FAILED',
    NULL,
    2
);
```

---

## Database Indexes Strategy

### Performance Optimization Indexes

1. **Time-Series Queries** (MonitoringLog)
   - `(apiId, timestamp DESC)` — Fetch recent logs for an API
   - `(timestamp DESC)` — Global recent activity

2. **Incident Lookup**
   - `(apiId, status)` — Find open incidents for an API
   - `(status)` — Dashboard: count active incidents
   - `(incidentNumber)` — Direct incident lookup

3. **User Data Access**
   - `(userId, isActive)` on Api — Fetch user's active APIs
   - `(email)` on User — Login queries

4. **Alert Processing**
   - `(status, retryCount)` — Find failed alerts to retry

---

## Materialized Views (Future Optimization)

### API Metrics Summary (for fast dashboard)

```sql
CREATE MATERIALIZED VIEW api_metrics_summary AS
SELECT 
    a.id AS api_id,
    a.name AS api_name,
    COUNT(ml.id) AS total_checks,
    COUNT(ml.id) FILTER (WHERE ml.isAvailable = true) AS successful_checks,
    COUNT(ml.id) FILTER (WHERE ml.isAvailable = false) AS failed_checks,
    ROUND(AVG(ml.responseTime)::numeric, 2) AS avg_response_time,
    MIN(ml.responseTime) AS min_response_time,
    MAX(ml.responseTime) AS max_response_time,
    ROUND((COUNT(ml.id) FILTER (WHERE ml.isAvailable = true)::numeric / 
           NULLIF(COUNT(ml.id), 0) * 100), 2) AS uptime_percentage,
    MAX(ml.timestamp) AS last_checked_at
FROM "Api" a
LEFT JOIN "MonitoringLog" ml ON a.id = ml.apiId 
    AND ml.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY a.id, a.name;

-- Refresh periodically (e.g., every 5 minutes)
CREATE INDEX idx_api_metrics_summary_api_id ON api_metrics_summary(api_id);
```

---

## Data Integrity Rules

### Application-Level Enforcement

1. **One Open Incident Per API**
   ```typescript
   // Before creating incident, check:
   const existingIncident = await prisma.incident.findFirst({
     where: { apiId, status: { in: ['OPEN', 'INVESTIGATING'] } }
   });
   if (existingIncident) {
     // Update existing instead of creating new
   }
   ```

2. **Incident Resolution Validation**
   ```typescript
   // When resolving incident:
   await prisma.incident.update({
     where: { id: incidentId },
     data: { 
       status: 'RESOLVED', 
       resolvedAt: new Date() 
     }
   });
   ```

3. **Monitoring Log Consistency**
   ```typescript
   // isAvailable must align with status code
   const isAvailable = statusCode >= 200 && statusCode < 300;
   ```

---

## Backup and Recovery Strategy

### Backup Schedule
```bash
# Daily full backup
pg_dump monitoriq > backup_$(date +%Y%m%d).sql

# Continuous WAL archiving for point-in-time recovery
# Configure in postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /path/to/archive/%f'
```

### Recovery Point Objective (RPO)
- Target: < 1 hour of data loss maximum
- Continuous WAL archiving ensures minimal loss

### Recovery Time Objective (RTO)
- Target: < 30 minutes to restore service
- Automated restore scripts

---

## Database Migrations Strategy

### Prisma Migrations Workflow

```bash
# Create new migration
npx prisma migrate dev --name add_api_table

# Apply to production
npx prisma migrate deploy

# Reset development database (destructive)
npx prisma migrate reset
```

### Migration Best Practices

1. **Never modify existing migrations** (once applied to production)
2. **Always test migrations on staging first**
3. **Include rollback plan for each migration**
4. **Avoid data-destructive operations in production**
5. **Use transactions for complex migrations**

---

## Seed Data Script

```typescript
// prisma/seed.ts
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@monitoriq.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@monitoriq.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create test user
  const testPassword = await bcrypt.hash('Test123!', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: testPassword,
      role: 'USER',
    },
  });

  // Create test APIs
  await prisma.api.createMany({
    data: [
      {
        name: 'JSONPlaceholder API',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
        description: 'Public test API for demonstrations',
        monitoringInterval: 60,
        timeout: 5000,
        isActive: true,
        userId: testUser.id,
      },
      {
        name: 'HTTPBin Status 200',
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        description: 'Always returns 200 OK',
        monitoringInterval: 120,
        timeout: 3000,
        isActive: true,
        userId: testUser.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Query Performance Guidelines

### Efficient Queries

✅ **Good: Use indexes**
```sql
SELECT * FROM "MonitoringLog" 
WHERE apiId = $1 
ORDER BY timestamp DESC 
LIMIT 100;
-- Uses idx_monitoringlog_apiId_timestamp
```

❌ **Bad: No index, full table scan**
```sql
SELECT * FROM "MonitoringLog" 
WHERE errorMessage LIKE '%timeout%';
-- No index on errorMessage, slow on large tables
```

✅ **Good: Aggregate with WHERE clause**
```sql
SELECT COUNT(*) 
FROM "Incident" 
WHERE status = 'OPEN' AND severity = 'HIGH';
-- Uses idx_incident_status
```

✅ **Good: Pagination**
```sql
SELECT * FROM "Api" 
WHERE userId = $1 
ORDER BY createdAt DESC 
LIMIT 20 OFFSET 0;
```

---

## Database Size Estimation

### Storage Requirements (approximate)

| Table | Rows (1 year) | Avg Row Size | Total Size |
|-------|--------------|--------------|------------|
| User | 1,000 | 500 bytes | 0.5 MB |
| Api | 10,000 | 1 KB | 10 MB |
| MonitoringLog | 525M (1000 APIs × 1 check/min) | 200 bytes | 105 GB |
| Incident | 100,000 | 1 KB | 100 MB |
| AIAnalysis | 100,000 | 2 KB | 200 MB |
| Alert | 100,000 | 500 bytes | 50 MB |

**Total Estimated Size (1 year):** ~106 GB

**Optimization:**
- Archive MonitoringLogs older than 90 days
- Aggregate old data into summary tables
- Use table partitioning for MonitoringLog (by date)

---

## Connection Pooling Configuration

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// DATABASE_URL format:
// postgresql://user:password@localhost:5432/monitoriq?connection_limit=20&pool_timeout=20
```

**Recommended Pool Size:**
- Development: 5-10 connections
- Production: 20-50 connections (depends on server resources)

---

## Summary

This database design provides:

✅ **Normalized schema** — Minimal data redundancy  
✅ **Strong referential integrity** — Foreign keys, cascade rules  
✅ **Optimized for queries** — Strategic indexes  
✅ **Scalable** — Can handle millions of monitoring logs  
✅ **Data consistency** — Check constraints, unique constraints  
✅ **Audit trail** — createdAt/updatedAt timestamps  
✅ **Flexible** — JSONB for semi-structured data (recommendations)  

**Next:** Environment variables specification and folder structure
