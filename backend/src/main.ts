import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const appEnv = configService.get<string>('APP_ENV', 'development');

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: [frontendUrl],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 3600,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger (only in development)
  if (appEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Hosting Nepal API')
      .setDescription('Hosting Nepal Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Domains', 'Domain management')
      .addTag('Hosting', 'Hosting account management')
      .addTag('SSL', 'SSL certificate management')
      .addTag('Email', 'Email account management')
      .addTag('Billing', 'Orders, payments, and invoices')
      .addTag('Support', 'Support ticket management')
      .addTag('Admin', 'Admin panel endpoints')
      .addTag('Reseller', 'Reseller management')
      .addTag('Notifications', 'Notification management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log('Swagger documentation available at /api/docs');
  }

  await app.listen(port);
  logger.log(`Application running on port ${port} in ${appEnv} mode`);
  logger.log(`API base URL: ${configService.get<string>('APP_URL')}/api/v1`);
}

bootstrap();
