import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule, {
    bodyParser: false,
  });

  // Enable CORS for all origins
  app.enableCors({
    origin: '*',
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    // credentials: false,
    // allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.setGlobalPrefix('/api/');

  const port = process.env.PORT ?? 3000;

  Logger.log('Service run on port: ' + port);

  await app.listen(port);
}
void bootstrap();
