import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { User, UserCredential } from '@app/entities';

@Module({
  imports: [
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeature([User, UserCredential]),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
