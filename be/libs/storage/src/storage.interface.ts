export const STORAGE_SERVICE = 'STORAGE_SERVICE';

/** Tên bucket GridFS của module dùng storage — mỗi module một bucket riêng. */
export const STORAGE_BUCKET = 'STORAGE_BUCKET';

export interface StoredFileMeta {
  storageKey: string;
  size: number;
}

export interface StorageService {
  save(
    buffer: Buffer,
    opts: { filename: string; mimeType: string; tenantId: string },
  ): Promise<StoredFileMeta>;
  stream(
    storageKey: string,
    tenantId: string,
  ): Promise<NodeJS.ReadableStream>;
  delete(storageKey: string): Promise<void>;
}
