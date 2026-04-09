import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DomainService } from './domain.service';
import { SearchDomainDto, SuggestDomainDto } from './dto/search-domain.dto';
import { RegisterDomainDto } from './dto/register-domain.dto';
import { AddDnsRecordDto, UpdateDnsRecordDto } from './dto/dns-record.dto';
import { RenewDomainDto } from './dto/renew-domain.dto';
import { PortfolioQueryDto, ToggleAutoRenewDto, BulkDomainActionDto } from './dto/portfolio.dto';
import { InitiateTransferDto } from './dto/transfer.dto';
import { DomainBrokerRequestDto, PreRegisterDomainDto, BlockDomainDto, NegotiationRequestDto } from './dto/services.dto';
import { ListDomainForSaleDto, ToggleParkingDto } from './dto/investor.dto';
import {
  AddDelegateDto,
  CreateDnsTemplateDto,
  UpdateDnsTemplateDto,
  ApplyDnsTemplateDto,
  ExportDomainListDto,
  ActivityLogQueryDto,
} from './dto/settings.dto';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@ApiTags('Domains')
@Controller('domains')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain dashboard with stats and summaries' })
  @ApiResponse({ status: 200, description: 'Dashboard data with domain statistics' })
  async getDomainDashboard(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.getDomainDashboard(req.user.id);
    return { success: true, data: result };
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain analytics (trends, distribution, spending)' })
  @ApiResponse({ status: 200, description: 'Domain analytics data' })
  async getDomainAnalytics(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.getDomainAnalytics(req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH & SUGGESTIONS (public — no auth required)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('pricing')
  @ApiOperation({ summary: 'Get domain pricing for all popular TLDs (NPR with 80% margin)' })
  @ApiResponse({ status: 200, description: 'Pricing list for all TLDs' })
  async getDomainPricing() {
    const pricing = await this.domainService.getAllTldPricing();
    return { success: true, data: pricing };
  }

  @Get('search')
  @ApiOperation({ summary: 'Check domain availability across TLDs with pricing' })
  @ApiQuery({ name: 'q', description: 'Domain name to search (without TLD)', example: 'mybusiness' })
  @ApiQuery({ name: 'tlds', description: 'Comma-separated TLDs', example: 'com,net,org', required: false })
  @ApiResponse({ status: 200, description: 'Availability results with pricing for each TLD' })
  async searchDomains(@Query() dto: SearchDomainDto) {
    const results = await this.domainService.searchDomains(dto.q, dto.tlds ?? ['com', 'net', 'org']);
    return { success: true, data: results };
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Get domain name suggestions based on a keyword' })
  @ApiQuery({ name: 'q', description: 'Keyword for suggestions', example: 'mybusiness' })
  @ApiQuery({ name: 'tlds', description: 'Comma-separated TLDs', required: false })
  @ApiResponse({ status: 200, description: 'List of suggested domain names' })
  async suggestDomains(@Query() dto: SuggestDomainDto) {
    const suggestions = await this.domainService.suggestDomains(dto.q, dto.tlds ?? ['com', 'net', 'org', 'io', 'co']);
    return { success: true, data: suggestions };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTFOLIO
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated portfolio of all user domains with full details' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'tld', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'expiry', 'created'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of domains with full details' })
  async getPortfolio(
    @Req() req: AuthenticatedRequest,
    @Query() query: PortfolioQueryDto,
  ) {
    const result = await this.domainService.getPortfolio(req.user.id, query);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFERS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('transfers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List domains with pending transfer status' })
  @ApiResponse({ status: 200, description: 'List of pending transfers' })
  async listTransfers(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.listTransfers(req.user.id);
    return { success: true, data: result };
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a domain transfer into the system' })
  @ApiResponse({ status: 201, description: 'Transfer initiated' })
  @ApiResponse({ status: 400, description: 'Invalid input or missing RC customer' })
  @ApiResponse({ status: 409, description: 'Domain already exists' })
  async initiateDomainTransfer(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InitiateTransferDto,
  ) {
    const result = await this.domainService.initiateDomainTransfer(req.user.id, dto);
    return { success: true, data: result };
  }

  @Get('transfer/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current status of a domain transfer' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Transfer status details' })
  async getTransferStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.getTransferStatus(id, req.user.id);
    return { success: true, data: result };
  }

  @Delete('transfer/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an ongoing domain transfer' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled' })
  async cancelTransfer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.cancelTransfer(id, req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SERVICES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('services/dns-hosting')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List domains with DNS hosting enabled' })
  @ApiResponse({ status: 200, description: 'List of domains with DNS hosting' })
  async listDnsHostingDomains(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.listDnsHostingDomains(req.user.id);
    return { success: true, data: result };
  }

  @Post('services/broker')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a domain broker request for a premium domain' })
  @ApiResponse({ status: 201, description: 'Broker request submitted' })
  async requestDomainBroker(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DomainBrokerRequestDto,
  ) {
    const result = await this.domainService.requestDomainBroker(req.user.id, dto);
    return { success: true, data: result };
  }

  @Post('services/pre-register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Pre-register interest in a domain for future availability' })
  @ApiResponse({ status: 201, description: 'Pre-registration recorded' })
  async preRegisterDomain(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PreRegisterDomainDto,
  ) {
    const result = await this.domainService.preRegisterDomain(req.user.id, dto);
    return { success: true, data: result };
  }

  @Post('services/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Block a domain by registering across multiple TLDs' })
  @ApiResponse({ status: 201, description: 'Block results per TLD' })
  async blockDomain(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BlockDomainDto,
  ) {
    const result = await this.domainService.blockDomain(req.user.id, dto);
    return { success: true, data: result };
  }

  @Post('services/negotiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a negotiation request for a taken domain' })
  @ApiResponse({ status: 201, description: 'Negotiation request submitted' })
  async requestNegotiation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: NegotiationRequestDto,
  ) {
    const result = await this.domainService.requestNegotiation(req.user.id, dto);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVESTOR CENTRAL
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('investor/marketplace')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user domains listed for sale on marketplace' })
  @ApiResponse({ status: 200, description: 'List of marketplace listings' })
  async getMarketplaceListings(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.getMarketplaceListings(req.user.id);
    return { success: true, data: result };
  }

  @Post('investor/list-for-sale')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'List a domain for sale on the marketplace' })
  @ApiResponse({ status: 201, description: 'Domain listed for sale' })
  async listDomainForSale(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ListDomainForSaleDto,
  ) {
    const result = await this.domainService.listDomainForSale(req.user.id, dto);
    return { success: true, data: result };
  }

  @Delete('investor/list-for-sale/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a domain from sale listing' })
  @ApiParam({ name: 'id', description: 'Listing/Domain ID' })
  @ApiResponse({ status: 200, description: 'Domain unlisted' })
  async unlistDomain(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.unlistDomain(id, req.user.id);
    return { success: true, data: result };
  }

  @Get('investor/parking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domains with parking enabled' })
  @ApiResponse({ status: 200, description: 'List of parked domains' })
  async getParkingDomains(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.getParkingDomains(req.user.id);
    return { success: true, data: result };
  }

  @Get('investor/auctions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of active domain auctions' })
  @ApiResponse({ status: 200, description: 'List of active auctions' })
  async getAuctions(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.getAuctions(req.user.id);
    return { success: true, data: result };
  }

  @Get('investor/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain investor statistics' })
  @ApiResponse({ status: 200, description: 'Investor stats including listings, parking, estimated value' })
  async getInvestorStats(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.getInvestorStats(req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SETTINGS — DELEGATES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('settings/delegates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users with delegated domain access' })
  @ApiResponse({ status: 200, description: 'List of delegates' })
  async listDelegates(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.listDelegates(req.user.id);
    return { success: true, data: result };
  }

  @Post('settings/delegates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a delegate with specific domain permissions' })
  @ApiResponse({ status: 201, description: 'Delegate added' })
  async addDelegate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddDelegateDto,
  ) {
    const result = await this.domainService.addDelegate(req.user.id, dto);
    return { success: true, data: result };
  }

  @Delete('settings/delegates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a delegate' })
  @ApiParam({ name: 'id', description: 'Delegate ID' })
  @ApiResponse({ status: 200, description: 'Delegate removed' })
  async removeDelegate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.removeDelegate(id, req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SETTINGS — DNS TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('settings/dns-templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved DNS record templates' })
  @ApiResponse({ status: 200, description: 'List of DNS templates' })
  async listDnsTemplates(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.listDnsTemplates(req.user.id);
    return { success: true, data: result };
  }

  @Post('settings/dns-templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a DNS record template' })
  @ApiResponse({ status: 201, description: 'DNS template created' })
  async createDnsTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDnsTemplateDto,
  ) {
    const result = await this.domainService.createDnsTemplate(req.user.id, dto);
    return { success: true, data: result };
  }

  @Put('settings/dns-templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a DNS record template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'DNS template updated' })
  async updateDnsTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDnsTemplateDto,
  ) {
    const result = await this.domainService.updateDnsTemplate(id, req.user.id, dto);
    return { success: true, data: result };
  }

  @Delete('settings/dns-templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a DNS record template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'DNS template deleted' })
  async deleteDnsTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.deleteDnsTemplate(id, req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SETTINGS — EXPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('settings/exports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List previous domain list exports' })
  @ApiResponse({ status: 200, description: 'List of export records' })
  async listExports(@Req() req: AuthenticatedRequest) {
    const result = await this.domainService.listExports(req.user.id);
    return { success: true, data: result };
  }

  @Post('settings/exports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Export domain list as CSV or JSON' })
  @ApiResponse({ status: 201, description: 'Export generated with download content' })
  async exportDomainList(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ExportDomainListDto,
  ) {
    const result = await this.domainService.exportDomainList(req.user.id, dto);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY LOG
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('activity-log')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain-related activity log' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'domainId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated activity log' })
  async getDomainActivityLog(
    @Req() req: AuthenticatedRequest,
    @Query() query: ActivityLogQueryDto,
  ) {
    const result = await this.domainService.getDomainActivityLog(req.user.id, query);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN REGISTRATION & LISTING (auth required)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('bulk-action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a bulk action across multiple domains' })
  @ApiResponse({ status: 200, description: 'Bulk action results' })
  async bulkDomainAction(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BulkDomainActionDto,
  ) {
    const result = await this.domainService.bulkDomainAction(req.user.id, dto);
    return { success: true, data: result };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new domain' })
  @ApiResponse({ status: 201, description: 'Domain registered successfully' })
  @ApiResponse({ status: 400, description: 'Domain not available or invalid input' })
  @ApiResponse({ status: 409, description: 'Domain already registered in our system' })
  async registerDomain(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterDomainDto,
  ) {
    const result = await this.domainService.registerDomain(req.user.id, dto);
    return { success: true, data: result, message: 'Domain registered successfully' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all domains for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of domains' })
  async listDomains(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.domainService.listDomains(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: result };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed information about a specific domain' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Domain details' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async getDomain(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.getDomain(id, req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  @Post(':id/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew a domain for additional years' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Domain renewed successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async renewDomain(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RenewDomainDto,
  ) {
    const result = await this.domainService.renewDomain(
      id,
      req.user.id,
      dto.years,
    );
    return { success: true, data: result, message: 'Domain renewed successfully' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DNS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':id/dns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get DNS records for a domain' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'List of DNS records' })
  async getDnsRecords(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const records = await this.domainService.getDnsRecords(id, req.user.id);
    return { success: true, data: records };
  }

  @Post(':id/dns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a DNS record' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 201, description: 'DNS record added' })
  async addDnsRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddDnsRecordDto,
  ) {
    const result = await this.domainService.addDnsRecord(
      id,
      req.user.id,
      dto,
    );
    return { success: true, data: result };
  }

  @Put(':id/dns/:recordId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a DNS record' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiParam({ name: 'recordId', description: 'DNS record ID (base64 encoded composite)' })
  @ApiResponse({ status: 200, description: 'DNS record updated' })
  async updateDnsRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateDnsRecordDto,
  ) {
    const result = await this.domainService.updateDnsRecord(
      id,
      req.user.id,
      recordId,
      dto,
    );
    return { success: true, data: result };
  }

  @Delete(':id/dns/:recordId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a DNS record' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiParam({ name: 'recordId', description: 'DNS record ID (base64 encoded composite)' })
  @ApiResponse({ status: 200, description: 'DNS record deleted' })
  async deleteDnsRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('recordId') recordId: string,
  ) {
    const result = await this.domainService.deleteDnsRecord(
      id,
      req.user.id,
      recordId,
    );
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMESERVERS
  // ═══════════════════════════════════════════════════════════════════════════

  @Put(':id/nameservers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update nameservers for a domain' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Nameservers updated' })
  async updateNameservers(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('nameservers') nameservers: string[],
  ) {
    const result = await this.domainService.updateNameservers(
      id,
      req.user.id,
      nameservers,
    );
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK (THEFT PROTECTION)
  // ═══════════════════════════════════════════════════════════════════════════

  @Put(':id/lock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle domain theft protection (registrar lock)' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Lock status updated' })
  async toggleLock(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('enable') enable: boolean,
  ) {
    const result = await this.domainService.toggleLock(
      id,
      req.user.id,
      enable,
    );
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVACY PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  @Put(':id/privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle WHOIS privacy protection' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Privacy protection status updated' })
  async togglePrivacy(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('enable') enable: boolean,
  ) {
    const result = await this.domainService.togglePrivacy(
      id,
      req.user.id,
      enable,
    );
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN-SPECIFIC: AUTO-RENEW, AUTH CODE, DNS HOSTING, PARKING, TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════

  @Put(':id/auto-renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle auto-renew for a domain' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Auto-renew status updated' })
  async toggleAutoRenew(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ToggleAutoRenewDto,
  ) {
    const result = await this.domainService.toggleAutoRenew(id, req.user.id, dto.enabled);
    return { success: true, data: result };
  }

  @Get(':id/auth-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get EPP/Auth code for outbound domain transfer' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Auth code returned' })
  async getAuthCode(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.getAuthCode(id, req.user.id);
    return { success: true, data: result };
  }

  @Post(':id/dns-hosting')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable DNS hosting for a domain' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'DNS hosting enabled' })
  async enableDnsHosting(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.domainService.enableDnsHosting(id, req.user.id);
    return { success: true, data: result };
  }

  @Post(':id/parking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle domain parking' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Parking status updated' })
  async toggleParking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ToggleParkingDto,
  ) {
    const result = await this.domainService.toggleParking(id, req.user.id, dto.enabled);
    return { success: true, data: result };
  }

  @Post(':id/apply-dns-template')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a saved DNS template to a domain' })
  @ApiParam({ name: 'id', description: 'Domain ID' })
  @ApiResponse({ status: 200, description: 'Template applied with results' })
  async applyDnsTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ApplyDnsTemplateDto,
  ) {
    const result = await this.domainService.applyDnsTemplate(id, req.user.id, dto.templateId);
    return { success: true, data: result };
  }
}
