import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { DomainModule } from './modules/domain/domain.module';
import { BillingModule } from './modules/billing/billing.module';
import { HostingModule } from './modules/hosting/hosting.module';
import { SslModule } from './modules/ssl/ssl.module';
import { EmailModule } from './modules/email/email.module';
import { SupportModule } from './modules/support/support.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { SagaModule } from './modules/saga/saga.module';
import { ResellerModule } from './modules/reseller/reseller.module';
import { BlogModule } from './modules/blog/blog.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig],
    }),

    // Global event emitter
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Bull queue (Redis-backed)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    DomainModule,
    BillingModule,
    HostingModule,
    SslModule,
    EmailModule,
    SupportModule,
    NotificationModule,
    AdminModule,
    SagaModule,
    ResellerModule,
    BlogModule,
  ],
})
export class AppModule {}
