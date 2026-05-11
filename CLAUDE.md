# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills System

Skills: `.claude/skills/` — gọi trực tiếp bằng slash command
- `/db-fe` — Frontend pages, components, handlers
- `/db-be` — Backend services, APIs, controllers
- `/db-deploy` — Deploy BE/FE to production server
- `/db-update-knowledge` — Classify and persist discovered facts

Shared context: `.claude/context/`
Learnings: `.claude/skills/learnings/` (system.md, per-page files)

## Context Files

Đọc context files trong `.claude/context/` khi xử lý vấn đề liên quan:
- `service-communication.md` — Inter-service HTTP calls, ServiceClient config, deployment, bugs đã fix
- `be-api-map.md` — Full API endpoint map (all services, all routes)
- `active-pages.md` — Sidebar → Route → API mapping, active vs coming-soon pages

## Project Overview

Digital Books is a full-stack accounting/financial management system with:
- **Frontend (fe/)**: React + TypeScript + Vite with custom CHanlder state management pattern
- **Backend (be/)**: NestJS microservices monorepo with MongoDB

## Common Commands

### Frontend (fe/)
```bash
cd fe
npm install
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Backend (be/)
```bash
cd be
yarn install
yarn start:all:dev   # Start all microservices concurrently

# Individual services
yarn start:gateway:dev      # Port 3000
yarn start:auth:dev         # Port 3001
yarn start:master-data:dev  # Port 3002
yarn start:voucher:dev      # Port 3003
yarn start:cash-book:dev    # Port 3004
yarn start:payable:dev      # Port 3005
yarn start:reporting:dev    # Port 3006
yarn start:config:dev       # Port 3007

# Testing
yarn test            # Run unit tests
yarn test:watch      # Watch mode
yarn test:e2e        # E2E tests
yarn test:cov        # Coverage

# Database
yarn seed            # Seed database
yarn seed:dry-run    # Preview seed changes
yarn seed:clear      # Clear seeded data
```

## Architecture

### Frontend Structure
```
fe/src/
├── common/c-handler/    # CHanlder state management framework
├── components/          # Reusable UI components (shadcn/ui)
├── pages/               # Page components organized by feature
├── contexts/            # React contexts (AuthContext)
├── services/            # API services with Axios
├── hooks/               # Custom React hooks
└── config/              # App configuration
```

### Backend Microservices
```
be/
├── apps/
│   ├── gateway/             # API Gateway - routes to services
│   ├── auth-service/        # Authentication & JWT
│   ├── master-data-service/ # Master data (accounts, products, etc.)
│   ├── voucher-service/     # Voucher management
│   ├── cash-book-service/   # Cash flow management
│   ├── payable-service/     # Payables/receivables
│   ├── reporting-service/   # Financial reports
│   └── config-service/      # System configuration
└── libs/                    # Shared libraries
    ├── @app/auth            # Auth utilities
    ├── @app/core            # Core utilities
    ├── @app/database        # Database config
    ├── @app/dto             # Data Transfer Objects
    ├── @app/entities        # MongoDB entities
    └── @app/service-client  # Service-to-service HTTP client
```

## CHanlder Pattern (Frontend State Management)

**IMPORTANT**: Follow `fe/HANDLER_GUIDE.md` when creating new features.

### Directory Structure for New Features
```
src/feature-name/
├── featureHandler.ts          # Handler class extending CHanlder
├── FeatureHandlerContext.tsx  # Context + Provider + Hooks
├── FeatureComponent.tsx       # Main component (wraps Provider)
├── components/                # Sub-components by function
│   └── header/
│       ├── Header.tsx
│       └── Header.state.ts    # State types with module augmentation
└── sub-handler/               # Event handlers
    ├── index.ts               # Import all handlers
    └── init/
        ├── init.handler.ts    # Handler with @RegisterHandler decorator
        └── init.event.ts      # Event type definitions
```

### Key Rules
1. Main component only contains sub-components - no logic, just calls `init` event on mount
2. All logic in sub-handlers using `@RegisterHandler` and `@HandlerDecorator` decorators
3. Sub-components only display + call events via `handler.executeEvent()`
4. Use module augmentation (`declare module`) to merge state/event types
5. Each component has its own `.state.ts` file for shared state
6. Sub-handlers auto-register via import in `sub-handler/index.ts`
7. Events must define both `params` and `result` types

### Example Handler Creation
```typescript
// featureHandler.ts
import { CHanlder } from "@/common";
import "./sub-handler";

export interface FeatureEvents {}
export interface FeatureStates extends BaseStates {}

export class FeatureHandler extends CHanlder<FeatureEvents, FeatureStates> {
  constructor() {
    super("feature-context");
  }
}
```

## Path Aliases

### Frontend
- `@/*` → `./src/*`

### Backend
- `@app/auth` → `libs/auth/src`
- `@app/core` → `libs/core/src`
- `@app/database` → `libs/database/src`
- `@app/dto` → `libs/dto/src`
- `@app/entities` → `libs/entities/src`
- `@app/service-client` → `libs/service-client/src`

## Tech Stack

### Frontend
- React 18, TypeScript, Vite
- shadcn/ui + Radix UI + Tailwind CSS
- TanStack React Query, React Hook Form + Zod
- RxJS (for CHanlder pattern)

### Backend
- NestJS 11, TypeScript
- MongoDB with TypeORM
- Passport.js with JWT authentication
- class-validator, class-transformer

## Environment Configuration

### Frontend
- `.env.development`: `VITE_API_BASE_URL=http://localhost:3000/api`
- `.env.production`: Production API URL

### Backend
- `.env-cmdrc`: Multi-environment config for all services
- Uses `env-cmd` to load service-specific environment variables
