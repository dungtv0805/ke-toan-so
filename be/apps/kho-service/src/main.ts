import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { KhoServiceModule } from './kho-service.module';

async function bootstrap() {
  const app = await NestFactory.create(KhoServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.enableCors();
  const port = process.env.KHO_SERVICE_PORT || 3008;
  await app.listen(port);
  console.log(`Kho Service is running on port ${port}`);
}
bootstrap();
