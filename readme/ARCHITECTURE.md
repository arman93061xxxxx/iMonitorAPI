# MonitorIQ System Architecture

**Version:** 1.0  
**Date:** August 21, 2026  
**Status:** Design Phase

---

## 1. System Overview

MonitorIQ is an intelligent API monitoring and incident analysis platform that combines:
- **Real-time monitoring** of registered APIs
- **Intelligent incident detection** with AI-powered root cause analysis
- **Asynchronous event processing** using Kafka
- **Fast caching layer** with Redis
- **Persistent storage** with PostgreSQL
- **Automated alerting** via email (extensible to other channels)

### Core Principles

1. **PostgreSQL is the source of truth** — All persistent data lives here
2. **Redis is for speed** — Latest status, fast dashboard queries
3. **Kafka enables scale** — Async processing, decoupled services
4. **AI assists, not decides** — Monitoring engine determines facts, AI interprets
5. **Graceful degradation** — System continues if non-critical components fail
6. **No duplicate incidents** — Smart grouping and lifecycle management

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER/ADMIN                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                          │
│              (React/Vue - Browser-based UI)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXPRESS.JS REST API LAYER                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Auth      │  │  API Manager │  │  Dashboard   │          │
│  │  Controller  │  │  Controller  │  │  Controller  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                 │
│                            │                                     │
│                  ┌─────────┴─────────┐                          │
│                  ▼                   ▼                           │
│         ┌────────────────┐  ┌────────────────┐                 │
│         │  Auth Service  │  │  API Service   │                 │
│         └────────────────┘  └────────────────┘                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                ▼                        ▼
    ┌───────────────────┐    ┌───────────────────┐
    │   POSTGRESQL      │    │      REDIS        │
    │  (Primary DB)     │    │   (Fast Cache)    │
    └───────────────────┘    └───────────────────┘
                │
                │
┌───────────────┴─────────────────────────────────────────────────┐
│                     BACKGROUND JOBS                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           MONITORING ENGINE (Node-Cron)                  │    │
│  │                                                           │    │
│  │  1. Fetch active APIs from PostgreSQL                    │    │
│  │  2. Send HTTP requests (Axios)                           │    │
│  │  3. Measure response time & status                       │    │
│  │  4. Store monitoring logs → PostgreSQL                   │    │
│  │  5. Update latest status → Redis                         │    │
│  │  6. Detect incidents                                     │    │
│  │  7. Publish incident events → Kafka                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │     KAFKA     │
                    │ incident-     │
                    │   events      │
                    └───────┬───────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               INCIDENT PROCESSOR (Kafka Consumer)                │
│                                                                   │
│  1. Consume incident events                                      │
│  2. Enrich with historical data                                  │
│  3. Trigger AI analysis                                          │
│  4. Generate alerts                                              │
│  5. Store results → PostgreSQL                                   │
└────────────┬────────────────────────┬───────────────────────────┘
             │                        │
             ▼                        ▼
    ┌────────────────┐      ┌────────────────┐
    │  AI SERVICE    │      │ ALERT SERVICE  │
    │  (OpenAI/etc)  │      │   (Email/etc)  │
    └────────────────┘      └────────────────┘
```

---

## 3. Component Architecture

### 3.1 API Layer (Express.js)

**Responsibility:** Handle HTTP requests, authentication, validation, routing

**Structure:**
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts    → Handle HTTP requests
│   │   ├── auth.service.ts       → Business logic
│   │   ├── auth.routes.ts        → Route definitions
│   │   └── auth.validation.ts    → Request validation schemas
│   ├── api/
│   │   ├── api.controller.ts
│   │   ├── api.service.ts
│   │   ├── api.routes.ts
│   │   └── api.validation.ts
│   ├── incidents/
│   ├── monitoring/
│   └── dashboard/
├── middleware/
│   ├── auth.middleware.ts        → JWT verification
│   ├── error.middleware.ts       → Centralized error handling
│   ├── validation.middleware.ts  → Request validation
│   └── rate-limit.middleware.ts  → Rate limiting
└── utils/
    ├── logger.ts                 → Winston/Pino logger
    ├── response.ts               → Standardized API responses
    └── errors.ts                 → Custom error classes
```

**Failure Handling:**
- All errors caught by centralized error middleware
- Validation errors return 400 with clear messages
- Authentication errors return 401
- Authorization errors return 403
- Server errors return 500 with safe error messages (no stack traces in production)
- Database connection failures handled gracefully

---

### 3.2 Monitoring Engine

**Responsibility:** Periodically check API health and record results

**Flow:**
```
Node-Cron Trigger (every X minutes)
    ↓
MonitoringService.runMonitoringCycle()
    ↓
Fetch active APIs (PostgreSQL)
    ↓
For each API:
    ├─ Start timer
    ├─ Execute HTTP request (Axios with timeout)
    ├─ Calculate response time
    ├─ Evaluate health status
    ├─ Store MonitoringLog → PostgreSQL
    ├─ Update latest status → Redis
    └─ Check for incident conditions
            ↓
        If incident detected:
            ├─ Create/Update Incident → PostgreSQL
            └─ Publish event → Kafka
```

**Failure Handling:**
- One API failure doesn't stop monitoring of others
- Use Promise.allSettled for parallel monitoring
- Axios timeout prevents hanging requests
- Network errors caught and logged
- Redis failure doesn't stop PostgreSQL logging
- Kafka failure queued for retry

**Concurrency Strategy:**
- Monitor APIs in batches (e.g., 10 concurrent)
- Use p-limit or similar for controlled concurrency
- Prevent thundering herd problem

---

### 3.3 Incident Detection Logic

**Smart Incident Management:**

```typescript
// Pseudo-code for incident logic
function evaluateIncident(api: API, currentCheck: MonitoringLog) {
  const recentChecks = getRecentChecks(api.id, last: 5);
  const openIncident = getOpenIncident(api.id);
  
  if (currentCheck.isAvailable) {
    // SUCCESS CASE
    if (openIncident) {
      // Recovery detected
      resolveIncident(openIncident);
      publishRecoveryEvent();
    }
    return;
  }
  
  // FAILURE CASE
  const consecutiveFailures = countConsecutiveFailures(recentChecks);
  
  if (openIncident) {
    // Update existing incident
    updateIncident(openIncident, {
      failureCount: openIncident.failureCount + 1,
      lastFailureAt: now()
    });
  } else if (consecutiveFailures >= INCIDENT_THRESHOLD) {
    // Create new incident
    const incident = createIncident({
      apiId: api.id,
      status: 'OPEN',
      severity: determineSeverity(consecutiveFailures),
      startedAt: determineStartTime(recentChecks),
      detectedAt: now()
    });
    
    publishIncidentEvent(incident);
  }
}
```

**Incident Thresholds:**
- Default: 3 consecutive failures triggers incident
- Configurable per API
- Prevents alert spam from transient failures

---

### 3.4 Kafka Event Processing

**Topic:** `incident-events`

**Event Schema:**
```json
{
  "eventId": "uuid-v4",
  "eventType": "INCIDENT_DETECTED | INCIDENT_UPDATED | INCIDENT_RESOLVED",
  "timestamp": "ISO-8601",
  "incident": {
    "incidentId": "INC-123",
    "apiId": "API-456",
    "apiName": "Payment API",
    "apiUrl": "https://api.example.com/health",
    "status": "OPEN | INVESTIGATING | RESOLVED",
    "severity": "LOW | MEDIUM | HIGH | CRITICAL",
    "statusCode": 503,
    "errorMessage": "Service Unavailable",
    "responseTime": 5210,
    "consecutiveFailures": 5,
    "startedAt": "ISO-8601",
    "detectedAt": "ISO-8601"
  },
  "metadata": {
    "producerService": "monitoring-engine",
    "correlationId": "uuid-v4"
  }
}
```

**Consumer Processing:**
```
1. Receive event from Kafka
2. Validate event schema
3. Check for duplicate processing (idempotency key)
4. Enrich with historical data
5. Trigger AI analysis (async)
6. Generate alert (if needed)
7. Store results
8. Commit offset (only after successful processing)
```

**Failure Handling:**
- Consumer retries with exponential backoff
- Dead letter queue for permanently failed events
- Idempotency keys prevent duplicate processing
- Offset management ensures at-least-once delivery

---

### 3.5 AI Analysis Service

**Abstraction Layer:**
```typescript
// ai/ai.service.ts
interface AIProvider {
  analyzeIncident(context: IncidentContext): Promise<AIAnalysis>;
}

// ai/providers/openai.provider.ts
class OpenAIProvider implements AIProvider {
  async analyzeIncident(context: IncidentContext): Promise<AIAnalysis> {
    // OpenAI-specific implementation
  }
}

// Future: ai/providers/anthropic.provider.ts, gemini.provider.ts, etc.
```

**Input Context:**
```typescript
interface IncidentContext {
  api: {
    name: string;
    url: string;
    method: string;
  };
  incident: {
    statusCode: number;
    errorMessage: string;
    responseTime: number;
    consecutiveFailures: number;
    durationMinutes: number;
  };
  historicalMetrics: {
    averageResponseTime: number;
    recentResponseTimes: number[];
    uptimePercentage: number;
    recentFailures: Array<{
      timestamp: string;
      statusCode: number;
      error: string;
    }>;
  };
}
```

**Output Structure:**
```typescript
interface AIAnalysis {
  summary: string;              // Brief incident description
  possibleCause: string;        // AI's interpretation
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;           // 0.0 to 1.0
  recommendations: string[];    // Action items
  technicalDetails: {
    observedSymptoms: string[];
    relatedFactors: string[];
  };
  model: string;                // e.g., "gpt-4"
  generatedAt: string;          // ISO-8601
}
```

**Failure Handling:**
- AI failures don't block incident processing
- Store error state if AI unavailable
- Retry with backoff
- Fallback to rule-based analysis if AI repeatedly fails
- Rate limiting to prevent excessive API costs

---

### 3.6 Alert Service

**Current Implementation:** Email

**Structure:**
```typescript
interface AlertService {
  sendAlert(incident: Incident, analysis?: AIAnalysis): Promise<AlertResult>;
}

class EmailAlertService implements AlertService {
  async sendAlert(incident: Incident, analysis?: AIAnalysis): Promise<AlertResult> {
    const emailContent = this.buildEmailTemplate(incident, analysis);
    const result = await this.emailProvider.send(emailContent);
    
    // Store alert record
    await this.storeAlert({
      incidentId: incident.id,
      type: 'EMAIL',
      recipient: incident.api.owner.email,
      status: result.success ? 'SENT' : 'FAILED',
      sentAt: new Date(),
      error: result.error
    });
    
    return result;
  }
}
```

**Email Template:**
```
Subject: [MonitorIQ] 🔴 API Incident Detected - [API Name]

API: Payment API
Status: DOWN
HTTP Status: 503 Service Unavailable
Response Time: 5210ms (avg: 180ms)

Incident Details:
- Incident ID: INC-123
- Detected: 10:42 AM
- Consecutive Failures: 5
- Duration: 15 minutes

AI Analysis:
Possible Cause: The API is experiencing high server load or an internal service failure.

Recommendations:
- Check server application logs
- Verify database connectivity
- Review recent deployments
- Check dependent services

View Details: https://monitoriq.app/incidents/INC-123
```

**Failure Handling:**
- Retry failed emails (3 attempts with backoff)
- Store alert status for tracking
- Don't block incident processing on alert failure
- Alert the alerting system (meta-monitoring)

---

## 4. Data Architecture

### 4.1 PostgreSQL Schema

**Primary Database with Prisma ORM**

#### User Table
```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  apis         Api[]
  
  @@index([email])
}

enum Role {
  USER
  ADMIN
}
```

#### Api Table
```prisma
model Api {
  id                 String   @id @default(uuid())
  name               String
  url                String
  method             HttpMethod @default(GET)
  description        String?
  monitoringInterval Int      @default(60) // seconds
  timeout            Int      @default(5000) // milliseconds
  expectedStatusCode Int?     @default(200)
  isActive           Boolean  @default(true)
  
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  monitoringLogs     MonitoringLog[]
  incidents          Incident[]
  
  @@index([userId])
  @@index([isActive])
  @@index([monitoringInterval])
}

enum HttpMethod {
  GET
  POST
  PUT
  PATCH
  DELETE
  HEAD
  OPTIONS
}
```

#### MonitoringLog Table
```prisma
model MonitoringLog {
  id            String   @id @default(uuid())
  apiId         String
  api           Api      @relation(fields: [apiId], references: [id], onDelete: Cascade)
  
  timestamp     DateTime @default(now())
  statusCode    Int?
  responseTime  Int?     // milliseconds
  isAvailable   Boolean
  errorMessage  String?
  isTimeout     Boolean  @default(false)
  
  createdAt     DateTime @default(now())
  
  incidentLogs  IncidentLog[]
  
  @@index([apiId, timestamp])
  @@index([timestamp])
  @@index([isAvailable])
}
```

#### Incident Table
```prisma
model Incident {
  id              String         @id @default(cuid()) // CUID for sortable IDs
  incidentNumber  String         @unique // Human-readable: INC-001
  
  apiId           String
  api             Api            @relation(fields: [apiId], references: [id], onDelete: Cascade)
  
  status          IncidentStatus @default(OPEN)
  severity        Severity       @default(MEDIUM)
  
  startedAt       DateTime
  detectedAt      DateTime       @default(now())
  resolvedAt      DateTime?
  
  failureCount    Int            @default(1)
  
  summary         String?
  possibleCause   String?
  recommendation  String?
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  incidentLogs    IncidentLog[]
  aiAnalyses      AIAnalysis[]
  alerts          Alert[]
  
  @@index([apiId, status])
  @@index([status])
  @@index([severity])
  @@index([detectedAt])
}

enum IncidentStatus {
  OPEN
  INVESTIGATING
  RESOLVED
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

#### IncidentLog Table (Junction)
```prisma
model IncidentLog {
  id              String        @id @default(uuid())
  
  incidentId      String
  incident        Incident      @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  
  monitoringLogId String
  monitoringLog   MonitoringLog @relation(fields: [monitoringLogId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime      @default(now())
  
  @@unique([incidentId, monitoringLogId])
  @@index([incidentId])
}
```

#### AIAnalysis Table
```prisma
model AIAnalysis {
  id              String   @id @default(uuid())
  
  incidentId      String
  incident        Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  
  summary         String
  possibleCause   String
  confidence      Float    // 0.0 to 1.0
  severity        Severity
  recommendations Json     // Array of strings
  
  model           String   // e.g., "gpt-4"
  promptTokens    Int?
  completionTokens Int?
  
  createdAt       DateTime @default(now())
  
  @@index([incidentId])
}
```

#### Alert Table
```prisma
model Alert {
  id          String      @id @default(uuid())
  
  incidentId  String
  incident    Incident    @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  
  type        AlertType   @default(EMAIL)
  recipient   String
  status      AlertStatus @default(PENDING)
  
  sentAt      DateTime?
  error       String?
  retryCount  Int         @default(0)
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([incidentId])
  @@index([status])
}

enum AlertType {
  EMAIL
  SLACK
  WEBHOOK
  SMS
}

enum AlertStatus {
  PENDING
  SENT
  FAILED
  RETRY
}
```

---

### 4.2 Redis Cache Structure

**Purpose:** Fast access to current API status

**Key Patterns:**

```
# Current API Status
api:{apiId}:status
Value: JSON
{
  "status": "UP" | "DOWN",
  "statusCode": 200,
  "responseTime": 182,
  "checkedAt": "2026-08-21T12:30:00Z",
  "consecutiveFailures": 0
}
TTL: 2x monitoringInterval

# Open Incident for API
api:{apiId}:incident
Value: incidentId
TTL: None (deleted on resolution)

# Dashboard Aggregates (cached for performance)
dashboard:overview
Value: JSON
{
  "totalApis": 50,
  "healthyApis": 48,
  "downApis": 2,
  "activeIncidents": 2,
  "averageResponseTime": 240,
  "uptime": 98.5,
  "generatedAt": "2026-08-21T12:30:00Z"
}
TTL: 30 seconds

# Rate Limiting
ratelimit:{userId}:{endpoint}
Value: request count
TTL: 60 seconds
```

**Failure Strategy:**
- Redis unavailable = fall back to PostgreSQL
- Cache-aside pattern: check cache → miss → query DB → populate cache
- Don't fail operations if Redis is down

---

## 5. API Specification

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-08-21T12:30:00Z",
    "version": "v1"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "API_NOT_FOUND",
    "message": "The requested API does not exist",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-08-21T12:30:00Z",
    "version": "v1"
  }
}
```

---

### Endpoints

#### Authentication

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response: 201
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "token": "jwt-token"
  }
}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response: 200
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt-token"
  }
}
```

```http
GET /api/v1/auth/me
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

#### API Management

```http
POST /api/v1/apis
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Payment API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "description": "Main payment service health check",
  "monitoringInterval": 60,
  "timeout": 5000
}

Response: 201
{
  "success": true,
  "data": {
    "api": {
      "id": "uuid",
      "name": "Payment API",
      "url": "https://api.example.com/health",
      "method": "GET",
      "isActive": true,
      "createdAt": "2026-08-21T12:30:00Z"
    }
  }
}
```

```http
GET /api/v1/apis
Authorization: Bearer <token>
Query Params: ?page=1&limit=20&status=active

Response: 200
{
  "success": true,
  "data": {
    "apis": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

```http
GET /api/v1/apis/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "api": { ... },
    "currentStatus": {
      "status": "UP",
      "responseTime": 182,
      "lastChecked": "2026-08-21T12:30:00Z"
    }
  }
}
```

```http
PATCH /api/v1/apis/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated API Name",
  "isActive": true
}

Response: 200
```

```http
DELETE /api/v1/apis/:id
Authorization: Bearer <token>

Response: 204
```

---

#### Monitoring

```http
GET /api/v1/apis/:id/status
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "status": "UP",
    "statusCode": 200,
    "responseTime": 182,
    "lastChecked": "2026-08-21T12:30:00Z",
    "consecutiveFailures": 0
  }
}
```

```http
GET /api/v1/apis/:id/metrics
Authorization: Bearer <token>
Query: ?period=24h|7d|30d

Response: 200
{
  "success": true,
  "data": {
    "uptime": 99.2,
    "averageResponseTime": 240,
    "minResponseTime": 120,
    "maxResponseTime": 890,
    "totalChecks": 1440,
    "successfulChecks": 1428,
    "failedChecks": 12,
    "statusDistribution": {
      "200": 1428,
      "500": 8,
      "503": 4
    }
  }
}
```

```http
GET /api/v1/apis/:id/logs
Authorization: Bearer <token>
Query: ?page=1&limit=50&startDate=...&endDate=...

Response: 200
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "timestamp": "2026-08-21T12:30:00Z",
        "statusCode": 200,
        "responseTime": 182,
        "isAvailable": true
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### Incidents

```http
GET /api/v1/incidents
Authorization: Bearer <token>
Query: ?status=OPEN&severity=HIGH&page=1&limit=20

Response: 200
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "uuid",
        "incidentNumber": "INC-001",
        "api": {
          "id": "uuid",
          "name": "Payment API"
        },
        "status": "OPEN",
        "severity": "HIGH",
        "startedAt": "2026-08-21T10:00:00Z",
        "detectedAt": "2026-08-21T10:05:00Z",
        "failureCount": 5
      }
    ],
    "pagination": { ... }
  }
}
```

```http
GET /api/v1/incidents/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "incident": { ... },
    "aiAnalysis": {
      "summary": "...",
      "possibleCause": "...",
      "recommendations": ["...", "..."],
      "confidence": 0.85
    },
    "relatedLogs": [ ... ],
    "alerts": [ ... ]
  }
}
```

```http
POST /api/v1/incidents/:id/resolve
Authorization: Bearer <token>

Response: 200
```

---

#### Dashboard

```http
GET /api/v1/dashboard/overview
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "data": {
    "totalApis": 50,
    "healthyApis": 48,
    "downApis": 2,
    "activeIncidents": 2,
    "resolvedIncidentsToday": 5,
    "averageResponseTime": 240,
    "overallUptime": 98.5,
    "recentIncidents": [ ... ]
  }
}
```

---

## 6. Security Architecture

### 6.1 Authentication & Authorization

**JWT Token Structure:**
```json
{
  "sub": "user-id",
  "email": "john@example.com",
  "role": "USER",
  "iat": 1693000000,
  "exp": 1693086400
}
```

**Token Expiry:** 24 hours  
**Refresh Strategy:** User re-authenticates (Phase 1)

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Password Hashing:** bcrypt with salt rounds = 12

---

### 6.2 API Security

**Implemented Protections:**

1. **Helmet.js** — Security headers
   - X-Content-Type-Options
   - X-Frame-Options
   - Strict-Transport-Security
   - X-XSS-Protection

2. **CORS Configuration**
   ```typescript
   cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   })
   ```

3. **Rate Limiting**
   ```typescript
   // Per endpoint
   /api/v1/auth/* → 5 requests/15min
   /api/v1/* → 100 requests/15min
   ```

4. **Request Size Limits**
   ```typescript
   express.json({ limit: '10kb' })
   ```

5. **Input Validation**
   - Zod schemas for all inputs
   - Sanitization of user inputs
   - SQL injection prevention (Prisma ORM)

6. **Authorization**
   - Users can only access their own APIs
   - Admin role for system management

---

### 6.3 Secrets Management

**Environment Variables:**
```env
# Never commit actual values
DATABASE_URL=postgresql://user:password@localhost:5432/monitoriq
REDIS_URL=redis://localhost:6379
KAFKA_BROKER=localhost:9092

JWT_SECRET=<strong-random-secret>
JWT_EXPIRY=24h

AI_PROVIDER=openai
OPENAI_API_KEY=<api-key>

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<email>
EMAIL_PASSWORD=<app-password>

NODE_ENV=development|production
PORT=3000
```

**Best Practices:**
- Use `.env.example` with placeholder values
- Never commit `.env` to version control
- Use environment-specific configs
- Rotate secrets periodically

---

## 7. Monitoring & Observability

### MonitorIQ's Own Health

```http
GET /health
Response: 200
{
  "status": "healthy",
  "service": "MonitorIQ",
  "version": "1.0.0",
  "timestamp": "2026-08-21T12:30:00Z"
}
```

```http
GET /ready
Response: 200
{
  "application": "healthy",
  "database": "healthy",
  "redis": "healthy",
  "kafka": "healthy"
}
```

### Logging Strategy

**Log Levels:**
- `error` — Critical failures, exceptions
- `warn` — Non-critical issues, degraded performance
- `info` — Important business events
- `debug` — Detailed diagnostic information (dev only)

**Structured Logging:**
```json
{
  "level": "error",
  "timestamp": "2026-08-21T12:30:00Z",
  "service": "monitoring-engine",
  "message": "Failed to monitor API",
  "context": {
    "apiId": "uuid",
    "error": "ECONNREFUSED",
    "attempt": 1
  }
}
```

---

## 8. Scalability Considerations

### Current Architecture Limits (Phase 1)
- Single Node.js instance
- Can handle ~1000 APIs with 1-minute intervals
- Bottleneck: Monitoring engine sequential processing

### Future Scaling Strategies

**Horizontal Scaling:**
```
Multiple monitoring workers (Kafka-based task distribution)
Load balancer → Multiple API servers
Redis cluster
PostgreSQL read replicas
```

**Optimizations:**
- Database connection pooling
- Batch inserts for monitoring logs
- Parallel monitoring with controlled concurrency
- Cached dashboard queries
- CDN for frontend

---

## 9. Development Workflow

### Local Development
```bash
1. Clone repository
2. Install dependencies: npm install
3. Setup PostgreSQL, Redis, Kafka (Docker Compose)
4. Copy .env.example → .env
5. Run migrations: npx prisma migrate dev
6. Seed database: npm run seed
7. Start dev server: npm run dev
```

### Testing Strategy
- **Unit Tests** — Services, utilities, business logic
- **Integration Tests** — API endpoints with test database
- **E2E Tests** — Complete workflows (Postman/Newman)

### Git Workflow
- `main` — Production-ready code
- `develop` — Integration branch
- Feature branches: `feature/monitoring-engine`
- Commit messages: Conventional Commits

---

## 10. Deployment Architecture

### Docker Compose Stack
```yaml
services:
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: monitoriq
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  kafka:
    image: bitnami/kafka:latest
    environment:
      KAFKA_CFG_NODE_ID: 0
      KAFKA_CFG_PROCESS_ROLES: controller,broker
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 0@kafka:9093
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: CONTROLLER
    volumes:
      - kafka_data:/bitnami/kafka

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/monitoriq
      REDIS_URL: redis://redis:6379
      KAFKA_BROKER: kafka:9092
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
  kafka_data:
```

---

## 11. Risk Analysis & Mitigation

### Risk 1: Monitoring Engine Crashes
**Mitigation:**
- PM2 process manager for auto-restart
- Try-catch around all monitoring cycles
- One API failure doesn't crash the entire cycle

### Risk 2: Database Connection Pool Exhaustion
**Mitigation:**
- Configure appropriate pool size (10-20 connections)
- Use connection timeouts
- Monitor active connections

### Risk 3: Kafka Consumer Lag
**Mitigation:**
- Monitor consumer lag metrics
- Scale consumers if needed
- Dead letter queue for problematic events

### Risk 4: AI API Rate Limits/Costs
**Mitigation:**
- Cache AI analyses for similar incidents
- Rate limiting on AI service
- Fallback to rule-based analysis
- Cost monitoring alerts

### Risk 5: Alert Spam
**Mitigation:**
- Incident grouping (3 consecutive failures)
- Cooldown period between alerts
- Alert aggregation (hourly digest option)

### Risk 6: Redis Data Loss
**Mitigation:**
- Redis is cache only, not source of truth
- All critical data in PostgreSQL
- System works without Redis (degraded)

---

## 12. Success Metrics

### System Health
- API uptime: > 99.5%
- Average response time: < 200ms
- Monitoring accuracy: > 99%

### Performance
- Time to detect incident: < 5 minutes
- Time to alert: < 1 minute after detection
- Dashboard load time: < 2 seconds

### Business Metrics
- False positive rate: < 5%
- Incident resolution time: tracked
- User satisfaction: feedback collection

---

## Summary

This architecture provides:
✅ **Scalable foundation** — Can grow from 10 to 1000+ APIs  
✅ **Fault tolerance** — Graceful degradation when components fail  
✅ **Clear separation** — Modular services, easy to maintain  
✅ **Security-first** — Authentication, authorization, input validation  
✅ **Observable** — Logging, monitoring, health checks  
✅ **AI-enhanced** — Intelligent incident analysis  
✅ **Production-ready** — Docker, error handling, testing strategy  

**Next Steps:** Milestone 0.5 — Development Environment Setup
