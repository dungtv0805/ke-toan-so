import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { CongNoModule } from './cong-no/cong-no.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    CongNoModule,
  ],
})
export class PayableServiceModule {}
