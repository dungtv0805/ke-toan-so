import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ReportingServiceModule } from './reporting-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ReportingServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.REPORTING_SERVICE_PORT || 3006;
  await app.listen(port);
  console.log(`Reporting Service is running on port ${port}`);
}
bootstrap();
