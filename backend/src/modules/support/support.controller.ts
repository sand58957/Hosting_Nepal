import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketMessageDto } from './dto/add-ticket-message.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { GetTicketsDto } from './dto/get-tickets.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(private readonly supportService: SupportService) {}

  // ─── Public ────────────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all available ticket categories' })
  @ApiResponse({ status: 200, description: 'Returns all ticket category options' })
  getCategories() {
    return this.supportService.getCategories();
  }

  // ─── Authenticated endpoints ───────────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() dto: CreateTicketDto,
    @Request() req: { user: { id: string } },
  ) {
    this.logger.log(`User ${req.user.id} creating support ticket`);
    return this.supportService.createTicket(req.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the authenticated user's support tickets" })
  @ApiResponse({ status: 200, description: 'Paginated list of tickets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getMyTickets(
    @Request() req: { user: { id: string } },
    @Query() query: GetTicketsDto,
  ) {
    return this.supportService.getMyTickets(req.user.id, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full details of a support ticket including all messages' })
  @ApiResponse({ status: 200, description: 'Ticket details with message thread' })
  @ApiResponse({ status: 403, description: 'Forbidden — ticket belongs to another user' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async getTicketDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.supportService.getTicketDetails(id, req.user.id);
  }

  @Post(':id/messages')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a reply message to a support ticket' })
  @ApiResponse({ status: 201, description: 'Message added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — ticket belongs to another user' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketMessageDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.supportService.addMessage(id, req.user.id, dto);
  }

  @Patch(':id/close')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a support ticket' })
  @ApiResponse({ status: 200, description: 'Ticket closed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — ticket belongs to another user' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async closeTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.supportService.closeTicket(id, req.user.id);
  }

  @Patch(':id/reopen')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reopen a previously closed support ticket' })
  @ApiResponse({ status: 200, description: 'Ticket reopened successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — ticket belongs to another user' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  async reopenTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.supportService.reopenTicket(id, req.user.id);
  }

  @Patch(':id/priority')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket priority (admin only)' })
  @ApiResponse({ status: 200, description: 'Priority updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  updatePriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriorityDto,
    @Request() req: { user: { id: string; role: string } },
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update ticket priority');
    }
    return this.supportService.updatePriority(id, dto.priority);
  }
}
