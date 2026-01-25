import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.SERVICE_AUTH_PORT || 3001;

  await app.listen(port);
  Logger.log(`Auth Service running on port ${port}`, 'Bootstrap');
}
void bootstrap();
