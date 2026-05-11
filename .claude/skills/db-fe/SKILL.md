---
name: db-fe
description: Use when working on frontend pages, components, handlers, or UI features in the digital-books fe/ directory
---

# Digital Books — Frontend Skill

## Mandatory First Actions

1. Read `.claude/context/active-pages.md` — sidebar pages and their status
2. Read `.claude/skills/learnings/system.md` — system-wide facts
3. Read relevant per-page learnings if exists (e.g., `learnings/bao-cao.md`)

## Architecture

- React 18 + TypeScript + Vite
- CHanlder pattern for state management (see `fe/HANDLER_GUIDE.md`)
- shadcn/ui + Radix UI + Tailwind CSS
- TanStack React Query for data fetching
- Path alias: `@/*` → `./src/*`

## Page → API Flow Verification

Before modifying any page, verify the complete flow:

1. **Sidebar entry exists** — check `MainLayout.tsx` sidebar config
2. **Route exists** — check `App.tsx` route definition
3. **Page component exists** — check `src/pages/` directory
4. **API calls identified** — check services used in handler/component
5. **Backend endpoint confirmed** — cross-reference with `.claude/context/be-api-map.md`

## Key Patterns

### CHanlder Pattern
```
src/pages/{feature}/
├── {feature}Handler.ts          # Handler class
├── {Feature}HandlerContext.tsx   # Context + Provider
├── {Feature}Component.tsx        # Main component
├── components/                   # Sub-components
└── sub-handler/                  # Event handlers
```

### API Service Pattern
```typescript
// src/services/{feature}.service.ts
import { apiClient } from '@/config/api';
export const featureService = {
  getAll: (params) => apiClient.get('/endpoint', { params }),
  create: (data) => apiClient.post('/endpoint', data),
};
```

## Common Mistakes

- Forgetting to check if page is "Coming Soon" before implementing
- Not following CHanlder pattern for new features
- Calling wrong API endpoint (many similar names exist)
- Not verifying sidebar → route → page → API chain
