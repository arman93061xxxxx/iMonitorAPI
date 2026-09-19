# MonitorIQ Project Structure

**Version:** 1.0  
**Date:** August 21, 2026

---

## Complete Folder Structure

```
monitoriq/
│
├── .github/                          # GitHub specific files
│   └── workflows/
│       ├── ci.yml                    # CI/CD pipeline
│       └── deploy.yml                # Deployment workflow
│
├── backend/                          # Backend Node.js application
│   │
│   ├── src/                          # Source code
│   │   │
│   │   ├── config/                   # Configuration files
│   │   │   ├── index.ts              # Centralized config export
│   │   │   ├── env.ts                # Environment variable validation
│   │   │   ├── database.ts           # Prisma client instance
│   │   │   ├── redis.ts              # Redis client configuration
│   │   │   └── kafka.ts              # Kafka producer/consumer setup
│   │   │
│   │   ├── modules/                  # Feature modules
│   │   │   │
│   │   │   ├── auth/                 # Authentication module
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.validation.ts
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   ├── api/                  # API management module
│   │   │   │   ├── api.controller.ts
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── api.routes.ts
│   │   │   │   ├── api.validation.ts
│   │   │   │   └── api.types.ts
│   │   │   │
│   │   │   ├── monitoring/           # Monitoring engine module
│   │   │   │   ├── monitoring.controller.ts
│   │   │   │   ├── monitoring.service.ts
│   │   │   │   ├── monitoring.engine.ts      # Core monitoring logic
│   │   │   │   ├── monitoring.scheduler.ts   # Node-Cron jobs
│   │   │   │   ├── monitoring.routes.ts
│   │   │   │   └── monitoring.types.ts
│   │   │   │
│   │   │   ├── incidents/            # Incident management module
│   │   │   │   ├── incident.controller.ts
│   │   │   │   ├── incident.service.ts
│   │   │   │   ├── incident.routes.ts
│   │   │   │   ├── incident.validation.ts
│   │   │   │   ├── incident.detector.ts      # Incident detection logic
│   │   │   │   └── incident.types.ts
│   │   │   │
│   │   │   ├── alerts/               # Alert system module
│   │   │   │   ├── alert.service.ts
│   │   │   │   ├── alert.types.ts
│   │   │   │   ├── providers/
│   │   │   │   │   ├── email.provider.ts
│   │   │   │   │   ├── slack.provider.ts     # Future
│   │   │   │   │   └── webhook.provider.ts   # Future
│   │   │   │   └── templates/
│   │   │   │       └── incident-email.template.ts
│   │   │   │
│   │   │   ├── ai/                   # AI analysis module
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── ai.types.ts
│   │   │   │   └── providers/
│   │   │   │       ├── ai.provider.interface.ts
│   │   │   │       ├── openai.provider.ts
│   │   │   │       ├── anthropic.provider.ts # Future
│   │   │   │       └── fallback.provider.ts  # Rule-based fallback
│   │   │   │
│   │   │   ├── dashboard/            # Dashboard data module
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   └── dashboard.types.ts
│   │   │   │
│   │   │   └── users/                # User management module
│   │   │       ├── user.controller.ts
│   │   │       ├── user.service.ts
│   │   │       ├── user.routes.ts
│   │   │       └── user.types.ts
│   │   │
│   │   ├── middleware/               # Express middleware
│   │   │   ├── auth.middleware.ts            # JWT verification
│   │   │   ├── error.middleware.ts           # Global error handler
│   │   │   ├── validation.middleware.ts      # Request validation
│   │   │   ├── rate-limit.middleware.ts      # Rate limiting
│   │   │   ├── async-handler.middleware.ts   # Async error wrapper
│   │   │   └── request-logger.middleware.ts  # HTTP request logging
│   │   │
│   │   ├── jobs/                     # Background jobs
│   │   │   ├── monitoring.job.ts             # Main monitoring cron job
│   │   │   ├── cleanup.job.ts                # Log cleanup job (future)
│   │   │   └── index.ts                      # Job scheduler initialization
│   │   │
│   │   ├── events/                   # Event streaming (Kafka)
│   │   │   ├── kafka.producer.ts             # Kafka producer
│   │   │   ├── kafka.consumer.ts             # Kafka consumer
│   │   │   ├── incident.processor.ts         # Process incident events
│   │   │   └── event.types.ts                # Event schemas
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── logger.ts                     # Winston/Pino logger
│   │   │   ├── response.ts                   # API response formatter
│   │   │   ├── errors.ts                     # Custom error classes
│   │   │   ├── validators.ts                 # Custom validators
│   │   │   ├── helpers.ts                    # General helpers
│   │   │   └── constants.ts                  # App-wide constants
│   │   │
│   │   ├── types/                    # Global TypeScript types
│   │   │   ├── express.d.ts                  # Express type extensions
│   │   │   ├── global.d.ts                   # Global type declarations
│   │   │   └── common.types.ts               # Shared types
│   │   │
│   │   ├── app.ts                    # Express app setup
│   │   └── server.ts                 # Server entry point
│   │
│   ├── prisma/                       # Prisma ORM files
│   │   ├── schema.prisma                     # Database schema
│   │   ├── seed.ts                           # Database seeding script
│   │   └── migrations/                       # Auto-generated migrations
│   │       └── 20260821000000_init/
│   │
│   ├── tests/                        # Test files
│   │   ├── unit/                             # Unit tests
│   │   │   ├── auth.service.test.ts
│   │   │   ├── api.service.test.ts
│   │   │   ├── monitoring.service.test.ts
│   │   │   └── incident.detector.test.ts
│   │   │
│   │   ├── integration/                      # Integration tests
│   │   │   ├── auth.routes.test.ts
│   │   │   ├── api.routes.test.ts
│   │   │   └── monitoring.routes.test.ts
│   │   │
│   │   ├── e2e/                              # End-to-end tests
│   │   │   └── complete-workflow.test.ts
│   │   │
│   │   ├── fixtures/                         # Test data
│   │   │   ├── users.fixture.ts
│   │   │   └── apis.fixture.ts
│   │   │
│   │   └── helpers/                          # Test utilities
│   │       ├── test-server.ts
│   │       └── test-db.ts
│   │
│   ├── logs/                         # Application logs (gitignored)
│   │   ├── error.log
│   │   ├── combined.log
│   │   └── access.log
│   │
│   ├── scripts/                      # Utility scripts
│   │   ├── generate-secret.js                # Generate JWT secrets
│   │   ├── migrate-data.ts                   # Data migration scripts
│   │   └── check-health.ts                   # Health check script
│   │
│   ├── .env.example                  # Environment template
│   ├── .env                          # Local environment (gitignored)
│   ├── .gitignore                    # Git ignore rules
│   ├── .eslintrc.json                # ESLint configuration
│   ├── .prettierrc                   # Prettier configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── package.json                  # Node.js dependencies
│   ├── package-lock.json             # Locked dependencies
│   ├── Dockerfile                    # Docker image definition
│   ├── .dockerignore                 # Docker ignore rules
│   └── README.md                     # Backend documentation
│
├── frontend/                         # Frontend application
│   │
│   ├── public/                       # Static assets
│   │   ├── favicon.ico
│   │   └── logo.png
│   │
│   ├── src/                          # Frontend source code
│   │   │
│   │   ├── components/               # React components
│   │   │   ├── common/                       # Reusable components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Loader.tsx
│   │   │   │   └── Modal.tsx
│   │   │   │
│   │   │   ├── layout/                       # Layout components
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   ├── auth/                         # Auth components
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   │
│   │   │   ├── dashboard/                    # Dashboard components
│   │   │   │   ├── OverviewCard.tsx
│   │   │   │   ├── MetricsChart.tsx
│   │   │   │   └── RecentIncidents.tsx
│   │   │   │
│   │   │   ├── api/                          # API management components
│   │   │   │   ├── ApiList.tsx
│   │   │   │   ├── ApiForm.tsx
│   │   │   │   ├── ApiCard.tsx
│   │   │   │   └── ApiStatusBadge.tsx
│   │   │   │
│   │   │   └── incidents/                    # Incident components
│   │   │       ├── IncidentList.tsx
│   │   │       ├── IncidentDetails.tsx
│   │   │       └── AIAnalysisCard.tsx
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ApisPage.tsx
│   │   │   ├── ApiDetailsPage.tsx
│   │   │   ├── IncidentsPage.tsx
│   │   │   ├── IncidentDetailsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   ├── services/                 # API services
│   │   │   ├── api.service.ts                # Axios instance & interceptors
│   │   │   ├── auth.service.ts               # Auth API calls
│   │   │   ├── apis.service.ts               # API management calls
│   │   │   ├── monitoring.service.ts         # Monitoring data calls
│   │   │   ├── incidents.service.ts          # Incident API calls
│   │   │   └── dashboard.service.ts          # Dashboard data calls
│   │   │
│   │   ├── store/                    # State management (Redux/Zustand)
│   │   │   ├── index.ts
│   │   │   ├── authSlice.ts
│   │   │   ├── apiSlice.ts
│   │   │   └── incidentSlice.ts
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── formatters.ts                 # Date, number formatters
│   │   │   ├── validators.ts                 # Form validators
│   │   │   └── constants.ts                  # Constants
│   │   │
│   │   ├── types/                    # TypeScript types
│   │   │   ├── api.types.ts
│   │   │   ├── incident.types.ts
│   │   │   └── user.types.ts
│   │   │
│   │   ├── styles/                   # Global styles
│   │   │   ├── globals.css
│   │   │   └── variables.css
│   │   │
│   │   ├── App.tsx                   # Root component
│   │   ├── main.tsx                  # Entry point
│   │   └── router.tsx                # Route definitions
│   │
│   ├── .env.example                  # Frontend environment template
│   ├── .env                          # Frontend environment (gitignored)
│   ├── .gitignore
│   ├── .eslintrc.json
│   ├── tsconfig.json
│   ├── vite.config.ts                # Vite configuration
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
│
├── docker/                           # Docker configuration files
│   ├── postgres/
│   │   └── init.sql                          # PostgreSQL initialization
│   ├── redis/
│   │   └── redis.conf                        # Redis configuration
│   └── kafka/
│       └── server.properties                 # Kafka configuration
│
├── docs/                             # Additional documentation
│   ├── API.md                                # API documentation
│   ├── DEPLOYMENT.md                         # Deployment guide
│   ├── CONTRIBUTING.md                       # Contribution guidelines
│   └── TROUBLESHOOTING.md                    # Common issues & solutions
│
├── postman/                          # Postman collections
│   ├── MonitorIQ.postman_collection.json
│   └── MonitorIQ.postman_environment.json
│
├── .gitignore                        # Global gitignore
├── docker-compose.yml                # Development Docker Compose
├── docker-compose.prod.yml           # Production Docker Compose
├── Makefile                          # Common commands
├── README.md                         # Project overview
├── ARCHITECTURE.md                   # System architecture
├── DATABASE_DESIGN.md                # Database schema
├── ENV_SPECIFICATION.md              # Environment variables
└── LICENSE                           # License file
```

---

## Module Responsibilities

### Backend Modules

#### 1. Auth Module
- User registration
- User login
- JWT token generation/verification
- Password hashing
- Token refresh (future)

#### 2. API Module
- CRUD operations for APIs
- API ownership validation
- Enable/disable APIs
- API configuration management

#### 3. Monitoring Module
- Execute HTTP health checks
- Measure response times
- Record monitoring logs
- Update Redis cache
- Scheduled monitoring via Node-Cron

#### 4. Incidents Module
- Detect incident conditions
- Create/update/resolve incidents
- Generate incident numbers
- Link incidents to monitoring logs
- Query incident history

#### 5. Alerts Module
- Send email alerts
- Track alert status
- Retry failed alerts
- Support multiple alert channels (future)

#### 6. AI Module
- Analyze incidents with AI
- Generate recommendations
- Support multiple AI providers
- Fallback to rule-based analysis

#### 7. Dashboard Module
- Aggregate metrics
- Cache dashboard data
- Provide overview statistics
- Real-time status updates

---

## File Naming Conventions

### TypeScript Files
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Routes: `*.routes.ts`
- Middleware: `*.middleware.ts`
- Types: `*.types.ts`
- Validation: `*.validation.ts`
- Tests: `*.test.ts` or `*.spec.ts`

### Component Organization
```
modules/
└── feature-name/
    ├── feature.controller.ts     # HTTP request handling
    ├── feature.service.ts        # Business logic
    ├── feature.routes.ts         # Route definitions
    ├── feature.validation.ts     # Input validation schemas
    └── feature.types.ts          # TypeScript interfaces
```

---

## Import Organization

```typescript
// 1. External imports
import express from 'express';
import { z } from 'zod';

// 2. Internal imports - config
import { config } from '@/config';

// 3. Internal imports - services
import { AuthService } from './auth.service';

// 4. Internal imports - utils
import { logger } from '@/utils/logger';
import { ApiResponse } from '@/utils/response';

// 5. Internal imports - types
import { User } from '@/types/common.types';
```

---

## Path Aliases (TypeScript)

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@config/*": ["src/config/*"],
      "@modules/*": ["src/modules/*"],
      "@middleware/*": ["src/middleware/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

**Usage:**
```typescript
// Instead of: import { logger } from '../../../utils/logger';
import { logger } from '@/utils/logger';

// Instead of: import { config } from '../../config';
import { config } from '@config';
```

---

## Key Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### .eslintrc.json
```json
{
  "env": {
    "node": true,
    "es2022": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### .prettierrc
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

### .gitignore
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.lcov
.nyc_output/

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local
.env.production

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Prisma
prisma/migrations/*/migration.sql

# Temporary
tmp/
temp/
```

---

## Package.json Scripts

### Backend Scripts
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:prod": "NODE_ENV=production node dist/server.js",
    
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

---

## Makefile (Optional but Recommended)

```makefile
.PHONY: help install dev build start test clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	cd backend && npm install
	cd frontend && npm install

dev: ## Start development environment
	docker-compose up -d postgres redis kafka
	cd backend && npm run dev

build: ## Build for production
	cd backend && npm run build
	cd frontend && npm run build

start: ## Start production server
	cd backend && npm start

test: ## Run tests
	cd backend && npm test

db-migrate: ## Run database migrations
	cd backend && npm run db:migrate

db-seed: ## Seed database
	cd backend && npm run db:seed

clean: ## Clean build artifacts
	rm -rf backend/dist
	rm -rf frontend/dist
	docker-compose down -v

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

logs: ## View application logs
	docker-compose logs -f backend
```

---

## Development Workflow

### Initial Setup
```bash
1. Clone repository
2. Copy .env.example → .env
3. Install dependencies: npm install
4. Start Docker services: docker-compose up -d
5. Run migrations: npm run db:migrate
6. Seed database: npm run db:seed
7. Start dev server: npm run dev
```

### Daily Development
```bash
1. Start services: docker-compose up -d
2. Start backend: npm run dev
3. Make changes
4. Test: npm test
5. Lint: npm run lint
6. Commit changes
```

### Before Committing
```bash
1. Run linter: npm run lint:fix
2. Format code: npm run format
3. Run tests: npm test
4. Build check: npm run build
```

---

## Summary

This project structure provides:

✅ **Modular organization** — Clear separation of concerns  
✅ **Scalable architecture** — Easy to add new features  
✅ **Type safety** — Full TypeScript support  
✅ **Testable** — Unit, integration, E2E tests  
✅ **Developer-friendly** — Path aliases, scripts, Makefile  
✅ **Production-ready** — Docker, CI/CD, environment configs  
✅ **Maintainable** — Consistent naming, clear structure  

**Milestone 0 Complete! Ready for Milestone 0.5 — Development Environment Setup**
