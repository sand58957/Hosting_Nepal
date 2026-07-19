import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Public (no auth) liveness + DB-readiness probe at GET /api/v1/health.
  // 200 when the app is up and the DB responds; 503 if the DB is unreachable.
  @Get()
  @ApiOperation({ summary: 'Liveness + database readiness probe' })
  @ApiResponse({ status: 200, description: 'Service healthy' })
  @ApiResponse({ status: 503, description: 'Service degraded (database unreachable)' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // Pass a string message so HttpExceptionFilter preserves it (it reads
      // `message`/`error` off the exception, not a custom object payload).
      throw new ServiceUnavailableException('Database unreachable');
    }

    return { status: 'ok', db: 'up', uptime: Math.round(process.uptime()) };
  }
}
