# MonitorIQ — Intelligent API Monitoring & Incident Analysis Platform

A lightweight, AI-assisted alternative to Prometheus/Datadog-style monitoring: register APIs, check their health on a schedule, detect real incidents (not just single failed pings), and get an AI-generated "possible cause + what to check next" report instead of a bare status code.

> Supersedes the earlier Spring Boot / "IntelliMonitor" proposal. This project is Node.js/Express end to end — ignore any older docs that mention Spring.

---

## Problem this solves

Basic monitoring tools tell you an API is down. They don't tell you *why*, and running Datadog/Grafana-class tooling is overkill for a small project or team. MonitorIQ periodically checks registered APIs, records response time/status history, groups repeated failures into a single incident, and asks an AI service to suggest a likely cause and next investigation steps based on the incident's evidence (status codes, timing trend, recent failure pattern).

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime / API | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis (latest API status, fast dashboard reads) |
| Event streaming | Kafka (incident events → async processing) |
| Scheduling | node-cron |
| HTTP checks | Axios |
| Auth | JWT + bcrypt |
| AI analysis | Provider-agnostic AI service, OpenAI as first implementation |
| Testing | Jest + Supertest, Postman collection |
| Infra | Docker + Docker Compose |
| Source control | Git + GitHub |

---

## Milestone roadmap

Rule: **a milestone isn't done until its "Definition of Done" passes.** Don't start the next milestone until the current one is verified — this keeps an AI coding agent (or you) from silently drifting scope.

- [x] **M0 — Project Setup & Environment**
  Git init, `.gitignore`, TypeScript config, folder structure, `.env.example`, and a `docker-compose.yml` that brings up Postgres + Redis + Kafka (KRaft mode — skip Zookeeper, one less service to run) together.
  **DoD:** `docker compose up -d` starts all infra; `npm install` succeeds.

- [x] **M1 — Node.js Backend Foundation** *(complete)*
  Express + TS entry points, centralized error handling, request validation, Winston/Morgan logging, standardized response envelope, `/health`.
  **DoD:** server starts, `GET /health` → 200.

- [ ] **M2 — PostgreSQL + Prisma Data Layer**
  Schema: `User`, `MonitoredApi`, `MonitoringLog`, `Incident`. Migrations.
  **DoD:** `npx prisma migrate dev` succeeds; tables exist and match schema.

- [ ] **M3 — Authentication**
  Register/login, JWT issuing, bcrypt hashing, auth middleware.
  **DoD:** protected route returns 401 without a token, 200 with a valid one.

- [ ] **M4 — API Registration & Management**
  CRUD for monitored APIs (url, method, interval, timeout, headers), scoped per user.
  **DoD:** a user can register, list, update, and delete their own monitored APIs only.

- [ ] **M5 — Monitoring Engine (node-cron + Axios + Redis)**
  Scheduler fires per-API interval, Axios performs the check and times it, result is written to Postgres (history) and Redis (`api:<id>:status`, latest snapshot).
  **DoD:** registering an API produces a check in both Postgres and Redis within one interval.

- [ ] **M6 — Incident Detection, Kafka Pipeline & Alerts**
  Consecutive-failure logic opens one `Incident` (not one per failed check). Producer publishes the event; a consumer (incident processor) picks it up; an email alert fires.
  **DoD:** simulating N consecutive failures on a test API produces exactly one open incident and one email.

- [ ] **M7 — AI-Assisted Incident Analysis**
  AI service abstraction with a single OpenAI implementation behind it (the abstraction just needs to prove it's swappable — don't build two providers). Generates likely cause + recommended checks from the incident's evidence, stored on the `Incident` record.
  **DoD:** an open incident gets an attached AI report with cause + recommendations.

- [ ] **M8 — Dashboard/Reporting APIs + Testing**
  Endpoints for current status, response-time history, incident list/detail. Jest+Supertest suite for core routes. Postman collection committed.
  **DoD:** test suite passes; Postman collection covers every endpoint above.

- [ ] **M9 — Dockerization, Docs & Deployment**
  App Dockerfile added to the M0 compose file so the *whole* stack (app + infra) comes up together. Final env-var reference and architecture notes.
  **DoD:** fresh clone → `docker compose up` → working stack, no manual steps.

---

## Getting started

```bash
cp .env.example .env          # fill in secrets
docker compose up -d          # postgres + redis + kafka
npm install
npx prisma migrate dev
npm run dev
curl http://localhost:3000/health
```

## Project structure

```
src/
  app.ts                # express app (routes, middleware)
  server.ts             # entry point
  config/               # env, database, redis, kafka clients
  routes/                
  middleware/            # error handling, validation, auth
  services/
    monitoring/          # cron + axios checks
    incidents/           # detection + kafka producer/consumer
    ai/                  # provider abstraction + openai implementation
  utils/                 # response envelope, logger
prisma/
  schema.prisma
tests/
```

## Scope notes for a time-boxed build

- One AI provider is enough — the abstraction layer is the deliverable, not multi-provider support.
- Kafka: single broker, single topic, KRaft mode. Don't reach for a multi-broker or Zookeeper setup.
- The parts worth spending real time on are the incident-detection logic (M6) and AI report quality (M7) — those are what differentiate this from a bare uptime pinger. Everything else is comparatively mechanical.
