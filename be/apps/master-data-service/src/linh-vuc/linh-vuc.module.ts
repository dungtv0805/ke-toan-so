import { Module } from '@nestjs/common';
import { LinhVuc, MenuCatalog, Tenant } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { LinhVucService } from './linh-vuc.service';
import { LinhVucController } from './linh-vuc.controller';

@Module({
  imports: [DatabaseModule.forFeatureRaw([LinhVuc, Tenant, MenuCatalog])],
  controllers: [LinhVucController],
  providers: [LinhVucService],
  exports: [LinhVucService],
})
export class LinhVucModule {}
