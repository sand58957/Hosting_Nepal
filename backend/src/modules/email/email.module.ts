import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { TitanEmailService } from './services/titan-email.service';
import { SendgridService } from './services/sendgrid.service';
import { EmailProcessor } from './processors/email.processor';
import { BillingEmailListener } from './listeners/billing-email.listener';
import { HostingEmailListener } from './listeners/hosting-email.listener';
import { AuthEmailListener } from './listeners/auth-email.listener';
import { PrismaService } from '../../database/prisma.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'email-provisioning' }),
  ],
  controllers: [EmailController],
  providers: [EmailService, TitanEmailService, SendgridService, EmailProcessor, BillingEmailListener, HostingEmailListener, AuthEmailListener, PrismaService, ResellerClubService],
  exports: [EmailService, SendgridService],
})
export class EmailModule {}
