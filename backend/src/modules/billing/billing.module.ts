import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../database/database.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { KhaltiService } from './services/khalti.service';
import { EsewaService } from './services/esewa.service';
import { ConnectIpsService } from './services/connectips.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentProcessor } from './processors/payment.processor';
import { BILLING_QUEUES } from './billing.constants';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    EventEmitterModule.forRoot(),
    BullModule.registerQueue(
      { name: BILLING_QUEUES.PAYMENT },
      { name: BILLING_QUEUES.INVOICE },
      { name: BILLING_QUEUES.DUNNING },
    ),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    KhaltiService,
    EsewaService,
    ConnectIpsService,
    InvoiceService,
    PaymentProcessor,
  ],
  exports: [BillingService, InvoiceService],
})
export class BillingModule {}
