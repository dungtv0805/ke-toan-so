# Phase 3: Frontend - Handler & Context

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tạo Handler, Context và State types cho HopDong page

---

## Task 1: Thêm Types vào fe/src/types/index.ts

**Files:**
- Modify: `fe/src/types/index.ts`

**Step 1: Thêm HopDong types**

Thêm vào section `// ===== DANH MỤC =====`:

```typescript
export enum TrangThaiHopDong {
  CHUA_CO_HD = 'CHUA_CO_HD',
  HD_CHUA_KY = 'HD_CHUA_KY',
  HD_PHOTO_SCAN = 'HD_PHOTO_SCAN',
  HD_GOC = 'HD_GOC',
}

export interface PhuLuc {
  giaTri?: number;
  ngayKy?: string;
}

export interface DieuKhoanThanhToan {
  tamUng?: string;
  thanhToanGiaiDoan?: string;
  quyetToan?: string;
}

export interface BaoHanh {
  giaTri?: number;
  thoiGian?: string;
  hinhThuc?: string;
}

export interface TienDoThiCong {
  soNgay?: number;
  tuNgay?: string;
  denNgay?: string;
}

export interface HopDong {
  id: string;
  soHopDong: string;
  tenCongTrinh: string;
  giaTriSauThue?: number;
  ngayKy?: string;
  phuLuc1?: PhuLuc;
  phuLuc2?: PhuLuc;
  doiTuongId?: string;
  doiTuongTen?: string;
  nguoiKy?: string;
  chucVu?: string;
  nguoiGiaoDich?: string;
  dieuKhoanThanhToan?: DieuKhoanThanhToan;
  baoHanh?: BaoHanh;
  tienDoThiCong?: TienDoThiCong;
  trangThai?: TrangThaiHopDong;
  soLuongLuu?: number;
}

export interface DanhMucHopDong {
  ma: string;
  ten: string;
  soHopDong: string;
  tenCongTrinh: string;
}
```

Thêm vào interface `DanhMuc`:
```typescript
hopDong?: DanhMucHopDong;
```

**Step 2: Commit**

```bash
git add fe/src/types/index.ts
git commit -m "feat(fe): add HopDong types and interfaces"
```

---

## Task 2: Tạo Handler

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/handler/hop-dong.handler.ts`

**Step 1: Tạo file handler**

```typescript
import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface HopDongEvents extends BaseEvents {}

export interface HopDongStates extends BaseStates {}

export class HopDongHandler extends CHanlder<HopDongEvents, HopDongStates> {
  constructor() {
    super("hop-dong");
  }
}
```

**Step 2: Commit**

```bash
mkdir -p fe/src/pages/danh-muc/hop-dong/handler
git add fe/src/pages/danh-muc/hop-dong/handler/hop-dong.handler.ts
git commit -m "feat(fe): add HopDongHandler class"
```

---

## Task 3: Tạo Sub-handler Index

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/index.ts`

**Step 1: Tạo file index**

```typescript
import "./init/init.handler";
import "./crud/crud.handler";
```

**Step 2: Commit**

```bash
mkdir -p fe/src/pages/danh-muc/hop-dong/handler/sub-handler
git add fe/src/pages/danh-muc/hop-dong/handler/sub-handler/index.ts
git commit -m "feat(fe): add HopDong sub-handler index"
```

---

## Task 4: Tạo Init Event

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.event.ts`

**Step 1: Tạo file event**

```typescript
import { HopDongEvents, HopDongStates } from "../../hop-dong.handler";
import { HopDong, DoiTuong } from "@/types";

declare module "../../hop-dong.handler" {
  interface HopDongEvents {
    init: {
      params: Record<string, never>;
      result: void;
    };
    refresh: {
      params: Record<string, never>;
      result: void;
    };
    search: {
      params: { keyword: string };
      result: void;
    };
    changePage: {
      params: { page: number; pageSize: number };
      result: void;
    };
  }

  interface HopDongStates {
    data: HopDong[];
    loading: boolean;
    pagination: {
      current: number;
      pageSize: number;
      total: number;
    };
    stats: {
      total: number;
      byTrangThai: Record<string, number>;
    };
    searchKeyword: string;
    doiTuongList: DoiTuong[];
  }
}
```

**Step 2: Commit**

```bash
mkdir -p fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init
git add fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.event.ts
git commit -m "feat(fe): add HopDong init events and states"
```

---

## Task 5: Tạo Init Handler

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.handler.ts`

**Step 1: Tạo file handler**

```typescript
import {
  RegisterHandler,
  HandlerDecorator,
} from "@/common/c-handler/core/decorators";
import { HopDongHandler } from "../../hop-dong.handler";
import api from "@/services/api";
import "./init.event";

@RegisterHandler(HopDongHandler)
export class InitHandler {
  @HandlerDecorator("init")
  async init(handler: HopDongHandler) {
    handler.setState("loading", true);
    try {
      const [hopDongRes, doiTuongRes, statsRes] = await Promise.all([
        api.get("/master-data/hop-dong", {
          params: { page: 1, limit: 50 },
        }),
        api.get("/master-data/doi-tuong/all"),
        api.get("/master-data/hop-dong/stats"),
      ]);

      const hopDongData = hopDongRes.data;
      handler.setState(
        "data",
        hopDongData.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }))
      );
      handler.setState("pagination", {
        current: hopDongData.meta?.page || 1,
        pageSize: hopDongData.meta?.limit || 50,
        total: hopDongData.meta?.total || 0,
      });

      handler.setState(
        "doiTuongList",
        (doiTuongRes.data.data || [])
          .filter((d: any) => d.loai === "KHACH_HANG")
          .map((item: any) => ({
            ...item,
            id: item._id || item.id,
          }))
      );

      handler.setState("stats", statsRes.data.data || { total: 0, byTrangThai: {} });
    } catch (error) {
      console.error("Failed to init HopDong:", error);
    } finally {
      handler.setState("loading", false);
    }
  }

  @HandlerDecorator("refresh")
  async refresh(handler: HopDongHandler) {
    handler.setState("searchKeyword", "");
    await this.init(handler);
  }

  @HandlerDecorator("search")
  async search(handler: HopDongHandler, params: { keyword: string }) {
    handler.setState("loading", true);
    handler.setState("searchKeyword", params.keyword);
    try {
      const response = await api.get("/master-data/hop-dong", {
        params: {
          page: 1,
          limit: 50,
          search: params.keyword,
        },
      });
      const data = response.data;
      handler.setState(
        "data",
        data.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }))
      );
      handler.setState("pagination", {
        current: data.meta?.page || 1,
        pageSize: data.meta?.limit || 50,
        total: data.meta?.total || 0,
      });
    } catch (error) {
      console.error("Failed to search:", error);
    } finally {
      handler.setState("loading", false);
    }
  }

  @HandlerDecorator("changePage")
  async changePage(
    handler: HopDongHandler,
    params: { page: number; pageSize: number }
  ) {
    handler.setState("loading", true);
    const searchKeyword = handler.getState("searchKeyword") || "";
    try {
      const response = await api.get("/master-data/hop-dong", {
        params: {
          page: params.page,
          limit: params.pageSize,
          search: searchKeyword,
        },
      });
      const data = response.data;
      handler.setState(
        "data",
        data.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }))
      );
      handler.setState("pagination", {
        current: data.meta?.page || 1,
        pageSize: data.meta?.limit || params.pageSize,
        total: data.meta?.total || 0,
      });
    } catch (error) {
      console.error("Failed to change page:", error);
    } finally {
      handler.setState("loading", false);
    }
  }
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.handler.ts
git commit -m "feat(fe): add HopDong init handler with API calls"
```

---

## Task 6: Tạo CRUD Event

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/crud/crud.event.ts`

**Step 1: Tạo file event**

```typescript
import { HopDongEvents } from "../../hop-dong.handler";

declare module "../../hop-dong.handler" {
  interface HopDongEvents {
    create: {
      params: { data: any };
      result: void;
    };
    update: {
      params: { id: string; data: any };
      result: void;
    };
    remove: {
      params: { id: string };
      result: void;
    };
  }
}
```

**Step 2: Commit**

```bash
mkdir -p fe/src/pages/danh-muc/hop-dong/handler/sub-handler/crud
git add fe/src/pages/danh-muc/hop-dong/handler/sub-handler/crud/crud.event.ts
git commit -m "feat(fe): add HopDong CRUD events"
```

---

## Task 7: Tạo CRUD Handler

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/crud/crud.handler.ts`

**Step 1: Tạo file handler**

```typescript
import {
  RegisterHandler,
  HandlerDecorator,
} from "@/common/c-handler/core/decorators";
import { HopDongHandler } from "../../hop-dong.handler";
import api from "@/services/api";
import "./crud.event";

@RegisterHandler(HopDongHandler)
export class CrudHandler {
  @HandlerDecorator("create")
  async create(handler: HopDongHandler, params: { data: any }) {
    handler.setState("loading", true);
    try {
      await api.post("/master-data/hop-dong", params.data);
      // Refresh data after create
      const [hopDongRes, statsRes] = await Promise.all([
        api.get("/master-data/hop-dong", { params: { page: 1, limit: 50 } }),
        api.get("/master-data/hop-dong/stats"),
      ]);
      handler.setState(
        "data",
        hopDongRes.data.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }))
      );
      handler.setState("pagination", {
        current: hopDongRes.data.meta?.page || 1,
        pageSize: hopDongRes.data.meta?.limit || 50,
        total: hopDongRes.data.meta?.total || 0,
      });
      handler.setState("stats", statsRes.data.data || { total: 0, byTrangThai: {} });
    } finally {
      handler.setState("loading", false);
    }
  }

  @HandlerDecorator("update")
  async update(handler: HopDongHandler, params: { id: string; data: any }) {
    handler.setState("loading", true);
    try {
      await api.put(`/master-data/hop-dong/${params.id}`, params.data);
      // Refresh data after update
      const pagination = handler.getState("pagination");
      const searchKeyword = handler.getState("searchKeyword") || "";
      const [hopDongRes, statsRes] = await Promise.all([
        api.get("/master-data/hop-dong", {
          params: {
            page: pagination?.current || 1,
            limit: pagination?.pageSize || 50,
            search: searchKeyword,
          },
        }),
        api.get("/master-data/hop-dong/stats"),
      ]);
      handler.setState(
        "data",
        hopDongRes.data.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }))
      );
      handler.setState("stats", statsRes.data.data || { total: 0, byTrangThai: {} });
    } finally {
      handler.setState("loading", false);
    }
  }

  @HandlerDecorator("remove")
  async remove(handler: HopDongHandler, params: { id: string }) {
    handler.setState("loading", true);
    try {
      await api.delete(`/master-data/hop-dong/${params.id}`);
      // Refresh data after delete
      const pagination = handler.getState("pagination");
      const searchKeyword = handler.getState("searchKeyword") || "";
      const [hopDongRes, statsRes] = await Promise.all([
        api.get("/master-data/hop-dong", {
          params: {
            page: pagination?.current || 1,
            limit: pagination?.pageSize || 50,
            search: searchKeyword,
          },
        }),
        api.get("/master-data/hop-dong/stats"),
      ]);
      handler.setState(
        "data",
        hopDongRes.data.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }))
      );
      handler.setState("pagination", {
        current: hopDongRes.data.meta?.page || 1,
        pageSize: hopDongRes.data.meta?.limit || 50,
        total: hopDongRes.data.meta?.total || 0,
      });
      handler.setState("stats", statsRes.data.data || { total: 0, byTrangThai: {} });
    } finally {
      handler.setState("loading", false);
    }
  }
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/handler/sub-handler/crud/crud.handler.ts
git commit -m "feat(fe): add HopDong CRUD handler"
```

---

## Task 8: Tạo Handler Context

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/HopDongHandlerContext.tsx`

**Step 1: Tạo file context**

```typescript
import React, { createContext, useContext, useMemo } from "react";
import { HopDongHandler, HopDongStates } from "./handler/hop-dong.handler";
import { useHandlerState } from "@/common";

const HopDongHandlerContext = createContext<HopDongHandler | null>(null);

export function HopDongHandlerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const handler = useMemo(() => new HopDongHandler(), []);

  return (
    <HopDongHandlerContext.Provider value={handler}>
      {children}
    </HopDongHandlerContext.Provider>
  );
}

export function useHopDongHandler(): HopDongHandler {
  const context = useContext(HopDongHandlerContext);
  if (!context) {
    throw new Error(
      "useHopDongHandler must be used within HopDongHandlerProvider"
    );
  }
  return context;
}

export function useHopDongState<K extends keyof HopDongStates>(
  key: K,
  defaultValue: HopDongStates[K]
): [HopDongStates[K], (value: HopDongStates[K]) => void] {
  const handler = useHopDongHandler();
  return useHandlerState(handler, key, defaultValue);
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongHandlerContext.tsx
git commit -m "feat(fe): add HopDongHandlerContext with hooks"
```

---

## Phase 3 Complete Checklist

- [ ] HopDong types added to types/index.ts
- [ ] HopDongHandler class created
- [ ] Sub-handler index created
- [ ] Init events and states defined
- [ ] Init handler with API calls
- [ ] CRUD events defined
- [ ] CRUD handler implemented
- [ ] Handler Context with Provider and hooks
