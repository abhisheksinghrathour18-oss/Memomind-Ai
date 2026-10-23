import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);

  // Enable CORS for frontend consumer
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global API v1 prefix
  app.setGlobalPrefix('api/v1');

  // Global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception handling
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);
  logger.log(`MemoMind API is running on: http://localhost:${port}/api/v1`);
  logger.log(`Health endpoint: http://localhost:${port}/api/v1/health`);
}

bootstrap();

