import { DynamicModule, Module } from '@nestjs/common';
import { GridFsStorageService } from './gridfs-storage.service';
import { STORAGE_BUCKET, STORAGE_SERVICE } from './storage.interface';

/**
 * Cấp `STORAGE_SERVICE` cho một module, mỗi module một bucket GridFS riêng
 * (vd 'tai_lieu_files', 'hop_dong_files') để file của hai nghiệp vụ không lẫn nhau.
 */
@Module({})
export class StorageModule {
  static forBucket(bucketName: string): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        { provide: STORAGE_BUCKET, useValue: bucketName },
        { provide: STORAGE_SERVICE, useClass: GridFsStorageService },
      ],
      exports: [STORAGE_SERVICE],
    };
  }
}
