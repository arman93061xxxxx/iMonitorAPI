# MonitorIQ Dependencies Specification

**Version:** 1.0  
**Date:** August 21, 2026

---

## Backend Dependencies (Node.js)

### Production Dependencies

```json
{
  "dependencies": {
    // Core Framework
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    
    // Environment & Configuration
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    
    // Database
    "@prisma/client": "^5.7.0",
    
    // Redis
    "redis": "^4.6.11",
    "ioredis": "^5.3.2",
    
    // Kafka
    "kafkajs": "^2.2.4",
    
    // Authentication
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    
    // Validation
    "joi": "^17.11.0",
    "validator": "^13.11.0",
    
    // HTTP Client
    "axios": "^1.6.2",
    
    // Scheduling
    "node-cron": "^3.0.3",
    "cron": "^3.1.6",
    
    // AI Providers
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.9.1",
    
    // Email
    "nodemailer": "^6.9.7",
    
    // Logging
    "winston": "^3.11.0",
    "morgan": "^1.10.0",
    
    // Rate Limiting
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    
    // Utilities
    "date-fns": "^2.30.0",
    "uuid": "^9.0.1",
    "p-limit": "^5.0.0",
    "http-status-codes": "^2.3.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    // TypeScript
    "typescript": "^5.3.3",
    "@types/node": "^20.10.5",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/nodemailer": "^6.4.14",
    "@types/morgan": "^1.9.9",
    "@types/uuid": "^9.0.7",
    "@types/validator": "^13.11.7",
    "@types/node-cron": "^3.0.11",
    
    // Build Tools
    "tsx": "^4.7.0",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "nodemon": "^3.0.2",
    
    // Prisma
    "prisma": "^5.7.0",
    
    // Testing
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    
    // Linting & Formatting
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "prettier": "^3.1.1",
    
    // Git Hooks
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0"
  }
}
```

---

## Frontend Dependencies (React + Vite)

### Production Dependencies

```json
{
  "dependencies": {
    // React
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    
    // State Management
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.12.2",
    
    // HTTP Client
    "axios": "^1.6.2",
    
    // UI Components
    "react-icons": "^4.12.0",
    "react-hot-toast": "^2.4.1",
    "recharts": "^2.10.3",
    "date-fns": "^2.30.0",
    
    // Forms
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.3",
    
    // Styling (optional - choose one)
    "tailwindcss": "^3.4.0",
    // OR
    "@mui/material": "^5.15.0",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    // Vite
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    
    // TypeScript
    "typescript": "^5.3.3",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    
    // Linting
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    
    // Tailwind (if using)
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

---

## Infrastructure Dependencies (Docker)

### Docker Images

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    # Lightweight PostgreSQL image
    
  redis:
    image: redis:7-alpine
    # Lightweight Redis image
    
  kafka:
    image: bitnami/kafka:3.6
    # Kafka with KRaft (no Zookeeper needed)
```

---

## Detailed Dependency Justification

### Core Backend Dependencies

#### Express.js
**Purpose:** Web framework for Node.js  
**Why:** Industry standard, mature, extensive middleware ecosystem  
**Alternatives:** Fastify (faster but less mature ecosystem)

#### Prisma
**Purpose:** Next-generation ORM  
**Why:**
- Type-safe database access
- Automatic migrations
- Excellent TypeScript support
- Built-in connection pooling

#### KafkaJS
**Purpose:** Apache Kafka client  
**Why:**
- Pure JavaScript (no native dependencies)
- Active maintenance
- Good documentation
- Supports latest Kafka features

#### Redis (ioredis)
**Purpose:** Redis client  
**Why:**
- Better performance than node-redis
- Cluster support
- Promise-based API
- Supports Redis streams

#### Node-Cron
**Purpose:** Task scheduling  
**Why:**
- Simple cron syntax
- Lightweight
- No external dependencies
- Works in-process (no separate scheduler needed)

#### Axios
**Purpose:** HTTP client for monitoring  
**Why:**
- Promise-based
- Request/response interceptors
- Timeout support
- Automatic JSON transformation
- Cancel requests support

#### Winston
**Purpose:** Logging library  
**Why:**
- Multiple transports (console, file, external services)
- Log levels
- Structured logging
- Production-ready

#### Zod
**Purpose:** Schema validation  
**Why:**
- TypeScript-first
- Runtime type checking
- Excellent error messages
- Works with React Hook Form

---

### Security Dependencies

#### Helmet
**Purpose:** Security headers middleware  
**Why:** Sets secure HTTP headers automatically

#### Bcryptjs
**Purpose:** Password hashing  
**Why:**
- Industry standard
- Slow by design (prevents brute force)
- No native dependencies (works on all platforms)

#### Jsonwebtoken
**Purpose:** JWT authentication  
**Why:**
- Stateless authentication
- Widely adopted
- Easy to implement

#### Express-rate-limit
**Purpose:** Rate limiting  
**Why:**
- Prevents abuse
- DDoS protection
- Simple configuration

---

### AI Dependencies

#### OpenAI SDK
**Purpose:** OpenAI API client  
**Why:**
- Official SDK
- GPT-4 access
- Streaming support
- Function calling

#### Anthropic SDK
**Purpose:** Claude AI client  
**Why:**
- Alternative to OpenAI
- Longer context windows
- Good reasoning capabilities

---

### Testing Dependencies

#### Jest
**Purpose:** Testing framework  
**Why:**
- Zero config for TypeScript
- Built-in mocking
- Snapshot testing
- Coverage reports

#### Supertest
**Purpose:** HTTP assertion library  
**Why:**
- Integration testing for Express
- Easy API endpoint testing
- Works with Jest

---

### Development Dependencies

#### TSX
**Purpose:** TypeScript execution  
**Why:**
- Faster than ts-node
- Watch mode support
- No compilation step needed for dev

#### Prisma CLI
**Purpose:** Database migrations  
**Why:**
- Auto-generate migrations
- Database introspection
- Seed data support

#### ESLint + Prettier
**Purpose:** Code quality  
**Why:**
- Consistent code style
- Catch errors early
- Auto-fix capabilities

---

## Optional Dependencies (Future Enhancements)

### Backend

```json
{
  "optional": {
    // API Documentation
    "swagger-ui-express": "^5.0.0",
    "@types/swagger-ui-express": "^4.1.6",
    
    // Monitoring & APM
    "@sentry/node": "^7.91.0",
    "prom-client": "^15.1.0",
    
    // Additional Alert Channels
    "@slack/web-api": "^6.10.0",
    "twilio": "^4.20.0",
    
    // File Upload (if needed)
    "multer": "^1.4.5-lts.1",
    "@types/multer": "^1.4.11",
    
    // Excel/CSV Export
    "exceljs": "^4.4.0",
    "csv-parse": "^5.5.3",
    
    // Caching Layer
    "cache-manager": "^5.3.2",
    "cache-manager-redis-store": "^3.0.1",
    
    // Advanced Scheduling
    "bull": "^4.12.0",
    "@types/bull": "^4.10.0",
    
    // GraphQL (alternative to REST)
    "apollo-server-express": "^3.13.0",
    "graphql": "^16.8.1"
  }
}
```

---

## Version Pinning Strategy

### Use Exact Versions for:
- Database clients (Prisma, Redis, Kafka)
- Security-critical packages (bcrypt, jwt)
- Build tools

### Use Caret (^) for:
- Utility libraries
- UI components
- Development tools

### Example package.json:
```json
{
  "dependencies": {
    "@prisma/client": "5.7.0",       // Exact version
    "bcryptjs": "2.4.3",              // Exact version
    "express": "^4.18.2",             // Caret (minor updates OK)
    "date-fns": "^2.30.0"             // Caret
  }
}
```

---

## Installation Commands

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Install Prisma CLI globally (optional)
npm install -g prisma

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
```

### Global Tools (Optional)
```bash
# TypeScript compiler
npm install -g typescript

# TSX for running TypeScript directly
npm install -g tsx

# Docker Compose (if not already installed)
# Windows: Install Docker Desktop
# Mac: brew install docker docker-compose
# Linux: apt-get install docker-compose
```

---

## Package Size Analysis

### Backend Bundle Size (Production)
```
node_modules:     ~250 MB (with dev dependencies)
Production only:  ~150 MB
Compiled dist:    ~5 MB

Docker image:     ~200 MB (Node Alpine + dependencies)
```

### Frontend Bundle Size
```
node_modules:     ~400 MB (with dev dependencies)
Production build: ~500 KB (gzipped)
```

---

## Security Audit

### Regular Security Checks
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

### Automated Security
```json
// package.json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:update": "npm update",
    "security:check": "npm outdated"
  }
}
```

---

## Dependency Update Strategy

### Weekly
- Check for security updates
- Update patch versions

### Monthly
- Review minor version updates
- Test in development
- Update staging
- Update production

### Quarterly
- Consider major version updates
- Read breaking change notes
- Plan migration if needed

### Tools for Dependency Management
```bash
# Check outdated packages
npm outdated

# Interactive update tool
npx npm-check-updates -i

# Update all to latest (careful!)
npx npm-check-updates -u
npm install
```

---

## Monorepo Consideration (Future)

If project grows, consider monorepo structure:

```json
// package.json (root)
{
  "workspaces": [
    "backend",
    "frontend",
    "shared"
  ]
}
```

**Tools:**
- Turborepo
- Nx
- Lerna
- npm workspaces

---

## License Compatibility

All chosen dependencies use permissive licenses:
- MIT License (most packages)
- Apache 2.0 (Kafka)
- BSD (some utilities)

✅ Safe for commercial use  
✅ No copyleft obligations  
✅ No attribution requirements (except in documentation)

---

## Build Time Optimization

### Backend
```json
{
  "scripts": {
    "build": "tsc",
    "build:fast": "tsc --incremental",
    "build:watch": "tsc --watch"
  }
}
```

### Frontend (Vite)
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        },
      },
    },
  },
});
```

---

## CI/CD Dependency Caching

### GitHub Actions
```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### GitLab CI
```yaml
cache:
  paths:
    - node_modules/
    - .npm/
```

---

## Summary

This dependency specification provides:

✅ **Complete package list** — All required dependencies  
✅ **Justifications** — Why each package was chosen  
✅ **Version strategy** — When to pin, when to use ranges  
✅ **Security practices** — Audit and update procedures  
✅ **Build optimization** — Fast builds and small bundles  
✅ **License compliance** — All dependencies compatible  
✅ **Future-ready** — Optional packages for enhancements  

**Total Backend Dependencies:** ~40 production + ~30 dev  
**Total Frontend Dependencies:** ~20 production + ~15 dev  
**Infrastructure:** 3 Docker images (Postgres, Redis, Kafka)

---

## Milestone 0 Complete Summary

✅ **ARCHITECTURE.md** — Complete system design  
✅ **DATABASE_DESIGN.md** — Full schema with ER diagrams  
✅ **ENV_SPECIFICATION.md** — All environment variables  
✅ **PROJECT_STRUCTURE.md** — Complete folder organization  
✅ **DEPENDENCIES.md** — All required packages  

**Next Step:** Milestone 0.5 — Development Environment Setup  
(Create actual project structure, initialize Git, setup configs)
