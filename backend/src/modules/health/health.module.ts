import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

// PrismaService comes from the @Global DatabaseModule, so no imports needed.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
