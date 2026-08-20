import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule, TenantMiddleware } from '@app/core';
import { DatabaseModule } from '@app/database';
import { ServiceClientModule } from '@app/service-client';
import { ChungTuModule } from './chung-tu/chung-tu.module';
import { NhatKyChungModule } from './nhat-ky-chung/nhat-ky-chung.module';
import { KeHoachModule } from './ke-hoach/ke-hoach.module';
import { KeHoachBangModule } from './ke-hoach-bang/ke-hoach-bang.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    ServiceClientModule.forRoot(),
    ChungTuModule,
    NhatKyChungModule,
    KeHoachModule,
    KeHoachBangModule,
  ],
})
export class VoucherServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
