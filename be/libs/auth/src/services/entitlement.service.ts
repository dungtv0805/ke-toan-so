import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MenuCatalog, LinhVuc, Tenant } from '@app/entities';

const CONFIG_TTL_MS = 60_000;

@Injectable()
export class EntitlementService {
  private cache: { at: number; menus: MenuCatalog[]; linhVucs: LinhVuc[] } | null = null;

  constructor(private readonly dataSource: DataSource) {}

  /** null = path không thuộc menu nào (dùng chung). Ngược lại: code lĩnh vực sở hữu (≥1). */
  async resolveOwningCodes(fullPath: string): Promise<string[] | null> {
    const { menus, linhVucs } = await this.loadConfig();

    const matchedKeys = new Set<string>();
    for (const m of menus) {
      const prefixes = m.apiPrefixes ?? [];
      if (prefixes.some((p) => p && this.isPrefix(fullPath, p))) {
        matchedKeys.add(m.menuKey);
      }
    }
    if (matchedKeys.size === 0) return null;

    const codes = new Set<string>();
    for (const lv of linhVucs) {
      if (lv.isActive === false) continue;
      if ((lv.menuKeys ?? []).some((k) => matchedKeys.has(k))) codes.add(lv.code);
    }
    if (codes.size === 0) return ['KE_TOAN'];
    return [...codes];
  }

  async getTenantModules(tenantId: string): Promise<string[]> {
    const { ObjectId } = await import('mongodb');
    const tenant = await this.dataSource
      .getRepository(Tenant)
      .findOne({ where: { _id: new ObjectId(tenantId) as any } });
    const mods = tenant?.modules;
    return mods && mods.length ? mods : ['KE_TOAN'];
  }

  private isPrefix(fullPath: string, prefix: string): boolean {
    return fullPath === prefix || fullPath.startsWith(prefix + '/');
  }

  private async loadConfig(): Promise<{ menus: MenuCatalog[]; linhVucs: LinhVuc[] }> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CONFIG_TTL_MS) {
      return { menus: this.cache.menus, linhVucs: this.cache.linhVucs };
    }
    const menus = await this.dataSource.getRepository(MenuCatalog).find();
    const linhVucs = await this.dataSource.getRepository(LinhVuc).find();
    this.cache = { at: now, menus, linhVucs };
    return { menus, linhVucs };
  }
}
