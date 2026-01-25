import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { SoQuyModule } from './so-quy/so-quy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    SoQuyModule,
  ],
})
export class CashBookServiceModule {}
