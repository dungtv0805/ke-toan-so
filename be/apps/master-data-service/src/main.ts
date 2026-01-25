import { NestFactory } from '@nestjs/core';
import { MasterDataServiceModule } from './master-data-service.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(MasterDataServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.SERVICE_MASTER_DATA_PORT || 3002;

  await app.listen(port);
  Logger.log(`Master Data Service running on port ${port}`, 'Bootstrap');
}
void bootstrap();
