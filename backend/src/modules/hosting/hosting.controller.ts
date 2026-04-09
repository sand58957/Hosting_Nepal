import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { HostingService } from './hosting.service';
import { CreateHostingDto } from './dto/create-hosting.dto';
import { CreateVpsDto } from './dto/create-vps.dto';
import { ReinstallVpsDto } from './dto/reinstall-vps.dto';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpgradeVpsDto } from './dto/upgrade-vps.dto';
import { ExtendStorageDto } from './dto/extend-storage.dto';
import { AddAddonDto } from './dto/add-addon.dto';
import { TransferRegionDto } from './dto/transfer-region.dto';
import { ToggleRescueDto } from './dto/toggle-rescue.dto';
import {
  CreateWebsiteDto,
  CreateFtpDto,
  CreateDatabaseDto,
  InstallWordPressDto,
  RestoreBackupDto,
  ChangePhpDto,
} from './dto/create-website.dto';
import { DeployContainerDto, GenerateScriptDto } from './dto/deploy-container.dto';

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Hosting')
@ApiBearerAuth('JWT-auth')
@Controller('hosting')
export class HostingController {
  constructor(private readonly hostingService: HostingService) {}

  // ── Public ──────────────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'Get all hosting plans with live RC pricing (50% margin, NPR)' })
  @ApiResponse({ status: 200, description: 'List of hosting plans with live pricing' })
  async getPlans() {
    return this.hostingService.getPlansWithLivePricing();
  }

  // ── Shared / WordPress Hosting ──────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new hosting account (Shared / WordPress)' })
  @ApiResponse({ status: 201, description: 'Hosting account created and provisioning queued' })
  @ApiResponse({ status: 400, description: 'Invalid plan or request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createHosting(@Body() dto: CreateHostingDto, @Req() req: AuthRequest) {
    return this.hostingService.createHosting(req.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List all hosting accounts for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of hosting accounts' })
  getMyHosting(@Req() req: AuthRequest) {
    return this.hostingService.getMyHosting(req.user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get details of a specific hosting account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Hosting account details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getHostingDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getHostingDetails(id, req.user.id);
  }

  @Post(':id/suspend')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a hosting account (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Hosting account suspended' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  suspendHosting(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.hostingService.suspendHosting(id);
  }

  @Post(':id/unsuspend')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsuspend a hosting account (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Hosting account unsuspended' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  unsuspendHosting(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.hostingService.unsuspendHosting(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete / cancel a hosting account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Hosting account deletion queued' })
  deleteHosting(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.deleteHosting(id, req.user.id);
  }

  @Get(':id/stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get disk / bandwidth usage stats for a hosting account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  getHostingStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getHostingStats(id, req.user.id);
  }

  // ── Website Management ─────────────────────────────────────────────────────

  @Get('websites')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List all websites for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of websites with site details' })
  listWebsites(@Req() req: AuthRequest) {
    return this.hostingService.listWebsites(req.user.id);
  }

  @Post('websites')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new website (full site creation wizard)' })
  @ApiResponse({ status: 201, description: 'Website created successfully' })
  createWebsite(@Body() dto: CreateWebsiteDto, @Req() req: AuthRequest) {
    return this.hostingService.createWebsite(req.user.id, dto);
  }

  @Delete('websites/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a website' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  deleteWebsite(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.deleteWebsite(id, req.user.id);
  }

  // ── Site Tools ──────────────────────────────────────────────────────────────

  @Get('websites/:id/stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get site statistics (disk, bandwidth, visitors)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getSiteStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getSiteStats(id, req.user.id);
  }

  @Get('websites/:id/info')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get site info (IP, nameservers, PHP version)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getSiteInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getSiteInfo(id, req.user.id);
  }

  @Post('websites/:id/backup')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a backup for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createSiteBackup(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.createSiteBackup(id, req.user.id);
  }

  @Get('websites/:id/backups')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List backups for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  listSiteBackups(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.listSiteBackups(id, req.user.id);
  }

  @Post('websites/:id/restore')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a backup for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  restoreSiteBackup(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: RestoreBackupDto,
  ) {
    return this.hostingService.restoreSiteBackup(id, req.user.id, dto.backupFile);
  }

  // ── WordPress Management ──────────────────────────────────────────────────

  @Post('websites/:id/wordpress/install')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Install WordPress on a hosting account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  installWordPress(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: InstallWordPressDto,
  ) {
    return this.hostingService.installWordPress(id, req.user.id, dto);
  }

  @Get('websites/:id/wordpress')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get WordPress info (version, plugins, themes)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getWordPressInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getWordPressInfo(id, req.user.id);
  }

  @Post('websites/:id/wordpress/staging')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a staging copy of the WordPress site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createStaging(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.createStaging(id, req.user.id);
  }

  @Post('websites/:id/wordpress/staging/push')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push staging to live site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  pushStaging(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.pushStaging(id, req.user.id);
  }

  // ── CyberPanel Integration ────────────────────────────────────────────────

  @Post('websites/:id/ftp')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an FTP account for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createFtpAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: CreateFtpDto,
  ) {
    return this.hostingService.createFtpAccount(id, req.user.id, dto);
  }

  @Get('websites/:id/ftp')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List FTP accounts for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  listFtpAccounts(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.listFtpAccounts(id, req.user.id);
  }

  @Post('websites/:id/database')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a database for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createDatabase(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: CreateDatabaseDto,
  ) {
    return this.hostingService.createSiteDatabase(id, req.user.id, dto);
  }

  @Get('websites/:id/databases')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List databases for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  listDatabases(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.listSiteDatabases(id, req.user.id);
  }

  @Post('websites/:id/ssl')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Install SSL certificate via Let\'s Encrypt' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  installSsl(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.installSsl(id, req.user.id);
  }

  @Post('websites/:id/php')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change PHP version for the site' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  changePhp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: ChangePhpDto,
  ) {
    return this.hostingService.changePhpVersion(id, req.user.id, dto.version);
  }

  // ── Container Management ───────────────────────────────────────────────────

  @Get('containers/templates')
  @ApiOperation({ summary: 'List available Docker Compose app templates' })
  @ApiResponse({ status: 200, description: 'List of app templates' })
  getAppTemplates() {
    return this.hostingService.getAppTemplates();
  }

  @Get('containers/templates/:id')
  @ApiOperation({ summary: 'Get a specific Docker Compose template YAML' })
  @ApiParam({ name: 'id', type: 'string', description: 'Template ID (e.g. wordpress, mysql)' })
  @ApiResponse({ status: 200, description: 'Template YAML content' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getAppTemplate(@Param('id') id: string) {
    return this.hostingService.getAppTemplate(id);
  }

  @Post('containers/deploy')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deploy a Docker Compose app on a VPS' })
  @ApiResponse({ status: 200, description: 'Deployment instructions and compose YAML' })
  @ApiResponse({ status: 404, description: 'Hosting account or template not found' })
  deployApp(@Body() dto: DeployContainerDto, @Req() req: AuthRequest) {
    return this.hostingService.deployContainerApp(req.user.id, dto.hostingId, dto.templateId, dto.envVars);
  }

  @Get('containers/install-scripts')
  @ApiOperation({ summary: 'List available container install script options' })
  @ApiResponse({ status: 200, description: 'List of install script options' })
  getInstallScripts() {
    return this.hostingService.getInstallScripts();
  }

  @Post('containers/install-scripts/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a cloud-init install script for a container stack' })
  @ApiResponse({ status: 200, description: 'Generated install script' })
  @ApiResponse({ status: 400, description: 'Invalid container stack type' })
  generateInstallScript(@Body() dto: GenerateScriptDto) {
    return this.hostingService.generateInstallScript(dto.type);
  }

  // ── VPS ─────────────────────────────────────────────────────────────────────

  @Post('vps')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new VPS / VDS instance' })
  @ApiResponse({ status: 201, description: 'VPS created and provisioning queued' })
  @ApiResponse({ status: 400, description: 'Invalid plan' })
  createVps(@Body() dto: CreateVpsDto, @Req() req: AuthRequest) {
    return this.hostingService.createVps(req.user.id, dto);
  }

  @Get('vps/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get details of a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VPS details including live Proxmox status' })
  getVpsDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getVpsDetails(id, req.user.id);
  }

  @Post('vps/:id/start')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a stopped VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VPS start command issued' })
  startVps(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.startVps(id, req.user.id);
  }

  @Post('vps/:id/stop')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gracefully stop a running VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VPS shutdown command issued' })
  stopVps(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.stopVps(id, req.user.id);
  }

  @Post('vps/:id/restart')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VPS reboot command issued' })
  restartVps(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.restartVps(id, req.user.id);
  }

  @Post('vps/:id/reinstall')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reinstall the OS on a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VPS reinstall initiated' })
  reinstallVps(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: ReinstallVpsDto,
  ) {
    return this.hostingService.reinstallVps(id, req.user.id, dto);
  }

  // ── Snapshots ──────────────────────────────────────────────────────────────

  @Post('vps/:id/snapshots')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a snapshot for a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Snapshot creation initiated' })
  createVpsSnapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: CreateSnapshotDto,
  ) {
    return this.hostingService.createVpsSnapshot(id, req.user.id, dto);
  }

  @Get('vps/:id/snapshots')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List all snapshots for a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of snapshots' })
  listVpsSnapshots(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.listVpsSnapshots(id, req.user.id);
  }

  @Post('vps/:id/snapshots/:snapId/restore')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a VPS snapshot' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'snapId', type: 'string', description: 'Snapshot name/ID' })
  @ApiResponse({ status: 200, description: 'Snapshot rollback initiated' })
  restoreVpsSnapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('snapId') snapId: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.restoreVpsSnapshot(id, req.user.id, snapId);
  }

  @Delete('vps/:id/snapshots/:snapId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a VPS snapshot' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'snapId', type: 'string', description: 'Snapshot name/ID' })
  @ApiResponse({ status: 200, description: 'Snapshot deletion initiated' })
  deleteVpsSnapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('snapId') snapId: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.deleteVpsSnapshot(id, req.user.id, snapId);
  }

  // ── VNC Console ────────────────────────────────────────────────────────────

  @Get('vps/:id/vnc')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get VNC console connection info for a VPS' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VNC connection details' })
  getVncInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getVncInfo(id, req.user.id);
  }

  @Post('vps/:id/vnc/password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset VNC password for a VPS' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VNC password reset' })
  resetVncPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.resetVncPassword(id, req.user.id);
  }

  // ── Password Reset ─────────────────────────────────────────────────────────

  @Post('vps/:id/password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset root password for a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Password reset result' })
  resetVpsPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.hostingService.resetVpsPassword(id, req.user.id, dto);
  }

  // ── Upgrade Plan ───────────────────────────────────────────────────────────

  @Post('vps/:id/upgrade')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade a VPS to a new plan' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VPS upgrade result' })
  upgradeVps(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: UpgradeVpsDto,
  ) {
    return this.hostingService.upgradeVps(id, req.user.id, dto);
  }

  // ── Extend Storage ─────────────────────────────────────────────────────────

  @Post('vps/:id/storage')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend disk storage for a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Storage extended' })
  extendVpsStorage(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: ExtendStorageDto,
  ) {
    return this.hostingService.extendVpsStorage(id, req.user.id, dto);
  }

  // ── Add-Ons ────────────────────────────────────────────────────────────────

  @Get('vps/:id/addons')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get active add-ons for a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of active add-ons' })
  getVpsAddons(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getVpsAddons(id, req.user.id);
  }

  @Post('vps/:id/addons')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an add-on to a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Add-on added' })
  addVpsAddon(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: AddAddonDto,
  ) {
    return this.hostingService.addVpsAddon(id, req.user.id, dto);
  }

  @Delete('vps/:id/addons/:addonId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an add-on from a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'addonId', type: 'string', description: 'Add-on identifier' })
  @ApiResponse({ status: 200, description: 'Add-on removed' })
  removeVpsAddon(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addonId') addonId: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.removeVpsAddon(id, req.user.id, addonId);
  }

  // ── Rescue Mode ────────────────────────────────────────────────────────────

  @Post('vps/:id/rescue')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle rescue mode on a VPS instance' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rescue mode toggled' })
  toggleRescueMode(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: ToggleRescueDto,
  ) {
    return this.hostingService.toggleRescueMode(id, req.user.id, dto);
  }

  // ── Region Transfer ────────────────────────────────────────────────────────

  @Post('vps/:id/region')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request VPS transfer to a different region' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Region transfer request result' })
  transferVpsRegion(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: TransferRegionDto,
  ) {
    return this.hostingService.transferVpsRegion(id, req.user.id, dto);
  }

  // ── Usage Stats (enhanced) ─────────────────────────────────────────────────

  @Get('vps/:id/usage')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get detailed usage statistics for a VPS (CPU, RAM, network, disk IO)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time-series usage data' })
  getVpsUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.hostingService.getVpsUsage(id, req.user.id);
  }
}
