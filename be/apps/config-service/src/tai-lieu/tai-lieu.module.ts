import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { TaiLieu, PhanQuyen } from '@app/entities';
import { TaiLieu_Controller } from './tai-lieu.controller';
import { TaiLieu_Service } from './tai-lieu.service';
import { DocPermService } from './doc-perm.service';
import { StorageModule } from '@app/storage';

@Module({
  imports: [
    DatabaseModule.forFeature([TaiLieu]),
    DatabaseModule.forFeatureRaw([PhanQuyen]),
    AuthModule,
    StorageModule.forBucket('tai_lieu_files'),
  ],
  controllers: [TaiLieu_Controller],
  providers: [TaiLieu_Service, DocPermService],
})
export class TaiLieu_Module {}
