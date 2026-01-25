import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigServiceModule } from './config-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ConfigServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.CONFIG_SERVICE_PORT || 3007;
  await app.listen(port);
  console.log(`Config Service is running on port ${port}`);
}
bootstrap();
