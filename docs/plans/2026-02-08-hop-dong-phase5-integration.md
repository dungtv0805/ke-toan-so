# Phase 5: Integration - Routing & Sidebar

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tích hợp HopDong page vào routing và sidebar navigation

---

## Task 1: Thêm Loadable Export

**Files:**
- Modify: `fe/src/pages/loadable.tsx`

**Step 1: Thêm HopDongPage export**

Thêm sau `LoaiGiaoDichPage` export:

```typescript
export const HopDongPage = loadable(() => import('./danh-muc/hop-dong/HopDongPage'), {
  fallback: <PageLoader />
});
```

**Step 2: Commit**

```bash
git add fe/src/pages/loadable.tsx
git commit -m "feat(fe): add HopDongPage to loadable exports"
```

---

## Task 2: Thêm Route trong App.tsx

**Files:**
- Modify: `fe/src/App.tsx`

**Step 1: Import HopDongPage**

Thêm `HopDongPage` vào import từ loadable:

```typescript
import {
  // ... existing imports
  HopDongPage,
  // ... rest
} from "./pages/loadable";
```

**Step 2: Thêm Route**

Tìm section `{/* Danh mục */}` và thay thế route `hop-dong` từ:

```typescript
<Route path="hop-dong" element={<ComingSoonPage />} />
```

Thành:

```typescript
<Route path="hop-dong" element={<HopDongPage />} />
```

**Step 3: Commit**

```bash
git add fe/src/App.tsx
git commit -m "feat(fe): add HopDong route in App.tsx"
```

---

## Task 3: Cập nhật MainLayout - existingRoutes

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Step 1: Thêm route vào existingRoutes**

Tìm `const existingRoutes = new Set([...])` và thêm:

```typescript
"/danh-muc/hop-dong",
```

**Step 2: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx
git commit -m "feat(fe): add hop-dong to existingRoutes in MainLayout"
```

---

## Phase 5 Complete Checklist

- [ ] HopDongPage added to loadable.tsx
- [ ] HopDongPage imported in App.tsx
- [ ] Route changed from ComingSoonPage to HopDongPage
- [ ] Route added to existingRoutes in MainLayout
