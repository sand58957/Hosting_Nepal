import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SslService } from './ssl.service';
import { IssueSslDto } from './dto/issue-ssl.dto';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@ApiTags('SSL')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ssl')
export class SslController {
  constructor(private readonly sslService: SslService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTING & DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get()
  @ApiOperation({ summary: 'List all SSL certificates for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of SSL certificates' })
  async getMyCertificates(@Req() req: AuthenticatedRequest) {
    const data = await this.sslService.getMyCertificates(req.user.id);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific SSL certificate' })
  @ApiParam({ name: 'id', description: 'SSL certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificateDetails(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.sslService.getCertificateDetails(id, req.user.id);
    return { success: true, data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUANCE
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('issue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a new SSL certificate (Let\'s Encrypt or ResellerClub)' })
  @ApiResponse({ status: 201, description: 'Certificate issuance queued' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate certificate' })
  @ApiResponse({ status: 404, description: 'Domain not found in user account' })
  async issueCertificate(
    @Body() dto: IssueSslDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.sslService.issueCertificate(req.user.id, dto);
    return { success: true, data, message: data.message };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger renewal of an SSL certificate' })
  @ApiParam({ name: 'id', description: 'SSL certificate ID' })
  @ApiResponse({ status: 200, description: 'Renewal queued' })
  @ApiResponse({ status: 400, description: 'Cannot renew a revoked or cancelled certificate' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async renewCertificate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.sslService.renewCertificate(id, req.user.id);
    return { success: true, data, message: data.message };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVOCATION
  // ═══════════════════════════════════════════════════════════════════════════

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an SSL certificate' })
  @ApiParam({ name: 'id', description: 'SSL certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 400, description: 'Certificate is already revoked' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async revokeCertificate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.sslService.revokeCertificate(id, req.user.id);
    return { success: true, data, message: data.message };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETION
  // ═══════════════════════════════════════════════════════════════════════════

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an SSL certificate record and its associated files' })
  @ApiParam({ name: 'id', description: 'SSL certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate deleted' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async deleteCertificate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.sslService.deleteCertificate(id, req.user.id);
    return { success: true, data, message: data.message };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':id/download')
  @ApiOperation({ summary: 'Download certificate files (cert, key, CA, fullchain) for an ACTIVE certificate' })
  @ApiParam({ name: 'id', description: 'SSL certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate file contents' })
  @ApiResponse({ status: 400, description: 'Certificate is not ACTIVE or files not found on disk' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async downloadCertificate(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.sslService.downloadCertificate(id, req.user.id);
    return { success: true, data };
  }
}
