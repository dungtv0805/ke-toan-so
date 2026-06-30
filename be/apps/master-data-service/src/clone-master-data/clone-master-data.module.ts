import { Module } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  TaiKhoan, HoSoChungTu, KhoanMuc, NhomKhoanMuc,
  LoaiChungTuMaster, LoaiGiaoDich, QuyChuan, Tenant,
} from '@app/entities';
import { DatabaseModule, RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { CloneMasterDataController } from './clone-master-data.controller';
import { CloneMasterDataService } from './clone-master-data.service';

const RAW_ENTITIES = [TaiKhoan, HoSoChungTu, KhoanMuc, NhomKhoanMuc, LoaiChungTuMaster, LoaiGiaoDich, QuyChuan];
const rawTokens = RAW_ENTITIES.map((e) => `${RAW_REPOSITORY_TOKEN_PREFIX}${e.name}`);

@Module({
  imports: [
    DatabaseModule.forFeatureRaw(RAW_ENTITIES),
    DatabaseModule.forFeatureIdentity([Tenant]),
  ],
  controllers: [CloneMasterDataController],
  providers: [
    {
      provide: CloneMasterDataService,
      useFactory: (tenantRepo: Repository<Tenant>, ...rawRepos: Repository<any>[]) => {
        const repos: Record<string, Repository<any>> = {};
        RAW_ENTITIES.forEach((e, i) => { repos[e.name] = rawRepos[i]; });
        return new CloneMasterDataService(repos, tenantRepo as any);
      },
      inject: [getRepositoryToken(Tenant, 'identity'), ...rawTokens],
    },
  ],
})
export class CloneMasterDataModule {}
