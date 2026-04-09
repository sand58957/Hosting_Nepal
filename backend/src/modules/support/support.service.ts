import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketMessageDto } from './dto/add-ticket-message.dto';
import { GetTicketsDto } from './dto/get-tickets.dto';

const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.BILLING]: 'Billing',
  [TicketCategory.TECHNICAL]: 'Technical Support',
  [TicketCategory.DOMAIN]: 'Domain',
  [TicketCategory.HOSTING]: 'Hosting',
  [TicketCategory.SSL]: 'SSL Certificate',
  [TicketCategory.EMAIL]: 'Email',
  [TicketCategory.GENERAL]: 'General Inquiry',
  [TicketCategory.ABUSE]: 'Abuse',
};

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = `TICK-${Date.now()}`;

    this.logger.log(`Creating support ticket for user ${userId}: ${ticketNumber}`);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        user: { connect: { id: userId } },
        ticketNumber,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        messages: {
          create: {
            sender: { connect: { id: userId } },
            message: dto.message,
            attachments: [],
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    this.logger.log(`Support ticket created: ${ticket.id} (${ticketNumber})`);
    this.eventEmitter.emit('support.ticket.created', { ticketId: ticket.id, userId, ticketNumber });

    return ticket;
  }

  async getMyTickets(userId: string, query: GetTicketsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { userId };
    if (query.status) {
      where['status'] = query.status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketDetails(id: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async addMessage(
    id: string,
    userId: string,
    dto: AddTicketMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    this.logger.log(`Adding message to ticket ${id} by user ${userId}`);

    const [message] = await Promise.all([
      this.prisma.ticketMessage.create({
        data: {
          ticket: { connect: { id } },
          sender: { connect: { id: userId } },
          message: dto.content,
          attachments: dto.attachments ?? [],
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.supportTicket.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    this.eventEmitter.emit('support.ticket.message.added', {
      ticketId: id,
      messageId: message.id,
      userId,
    });

    return message;
  }

  async closeTicket(id: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    this.logger.log(`Closing ticket ${id} for user ${userId}`);

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: TicketStatus.CLOSED },
    });

    this.eventEmitter.emit('support.ticket.closed', { ticketId: id, userId });

    return updated;
  }

  async reopenTicket(id: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    this.logger.log(`Reopening ticket ${id} for user ${userId}`);

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: TicketStatus.OPEN },
    });

    this.eventEmitter.emit('support.ticket.reopened', { ticketId: id, userId });

    return updated;
  }

  async updatePriority(id: string, priority: TicketPriority) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    this.logger.log(`Updating priority of ticket ${id} to ${priority}`);

    return this.prisma.supportTicket.update({
      where: { id },
      data: { priority },
    });
  }

  getCategories(): { value: TicketCategory; label: string }[] {
    return Object.values(TicketCategory).map((value) => ({
      value,
      label: TICKET_CATEGORY_LABELS[value] ?? value,
    }));
  }
}
