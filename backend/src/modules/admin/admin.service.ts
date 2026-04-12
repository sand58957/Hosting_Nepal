import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import {
  UserStatus,
  OrderStatus,
  PaymentStatus,
  HostingStatus,
  TicketStatus,
  NotificationType,
  NotificationCategory,
  PromoStatus,
  DiscountType,
} from '@prisma/client';
import { AdminQueryDto } from './dto/admin-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';

export interface RevenueDataPoint {
  period: string;
  revenue: number;
  orderCount: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeHosting: number;
  totalDomains: number;
  monthlyRevenue: number;
  openTickets: number;
  activeVps: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmountNpr: number;
    status: string;
    createdAt: Date;
    user: { id: string; name: string; email: string };
  }>;
  revenueChart: RevenueDataPoint[];
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard Stats ────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      totalUsers,
      activeHosting,
      totalDomains,
      monthlyRevenueResult,
      openTickets,
      activeVps,
      recentOrders,
      revenueRaw,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.hostingAccount.count({ where: { status: HostingStatus.ACTIVE } }),
      this.prisma.domain.count(),
      this.prisma.payment.aggregate({
        _sum: { amountNpr: true },
        where: {
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      }),
      this.prisma.hostingAccount.count({
        where: {
          status: HostingStatus.ACTIVE,
          planType: { in: ['VPS', 'DEDICATED'] as never[] },
        },
      }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          totalAmountNpr: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: twelveMonthsAgo },
        },
        select: { amountNpr: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Build 12-month revenue chart
    const revenueChart = this.buildMonthlyRevenueChart(revenueRaw, twelveMonthsAgo, now);

    return {
      totalUsers,
      activeHosting,
      totalDomains,
      monthlyRevenue: monthlyRevenueResult._sum.amountNpr ?? 0,
      openTickets,
      activeVps,
      recentOrders,
      revenueChart,
    };
  }

  private buildMonthlyRevenueChart(
    payments: Array<{ amountNpr: number; createdAt: Date }>,
    from: Date,
    to: Date,
  ): RevenueDataPoint[] {
    const map = new Map<string, { revenue: number; orderCount: number }>();

    // Pre-populate 12 months with zeros
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { revenue: 0, orderCount: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key);
      if (existing) {
        existing.revenue += p.amountNpr;
        existing.orderCount += 1;
      }
    }

    return Array.from(map.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      orderCount: data.orderCount,
    }));
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getAllUsers(query: AdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where['OR'] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where['role'] = query.role;
    }

    if (query.status) {
      where['status'] = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          companyName: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              domains: true,
              hostingAccounts: true,
              orders: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyName: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        rcCustomerId: true,
        preferredLanguage: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        domains: {
          select: {
            id: true,
            domainName: true,
            tld: true,
            status: true,
            expiryDate: true,
            autoRenew: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        hostingAccounts: {
          select: {
            id: true,
            planName: true,
            planType: true,
            status: true,
            expiryDate: true,
            diskSpaceMb: true,
            diskUsedMb: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            serviceType: true,
            totalAmountNpr: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        payments: {
          select: {
            id: true,
            gateway: true,
            amountNpr: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return user;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(
      `User ${id} status updated to ${dto.status}${dto.reason ? ` — reason: ${dto.reason}` : ''}`,
    );
    return updated;
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  async getAllOrders(query: AdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where['status'] = query.status as OrderStatus;
    }

    if (query.search) {
      where['OR'] = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.startDate || query.endDate) {
      where['createdAt'] = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          serviceType: true,
          planName: true,
          durationMonths: true,
          amountNpr: true,
          vatAmountNpr: true,
          totalAmountNpr: true,
          discountAmountNpr: true,
          promoCode: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Payments ───────────────────────────────────────────────────────────────

  async getAllPayments(query: AdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where['status'] = query.status as PaymentStatus;
    }

    if (query.startDate || query.endDate) {
      where['createdAt'] = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    if (query.search) {
      where['OR'] = [
        { gatewayTransactionId: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          gateway: true,
          gatewayTransactionId: true,
          amountNpr: true,
          status: true,
          verifiedAt: true,
          createdAt: true,
          order: { select: { orderNumber: true, serviceType: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Domains ────────────────────────────────────────────────────────────────

  async getAllDomains(query: AdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where['status'] = query.status;
    }

    if (query.search) {
      where['OR'] = [
        { domainName: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.domain.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          domainName: true,
          tld: true,
          status: true,
          registrationDate: true,
          expiryDate: true,
          autoRenew: true,
          privacyProtection: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.domain.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Hosting ─────────────────────────────────────────────────────────────────

  async getAllHosting(query: AdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where['status'] = query.status as HostingStatus;
    }

    if (query.search) {
      where['OR'] = [
        { planName: { contains: query.search, mode: 'insensitive' } },
        { cpanelUsername: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.hostingAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          planName: true,
          planType: true,
          provider: true,
          status: true,
          cpanelUsername: true,
          ipAddress: true,
          diskSpaceMb: true,
          diskUsedMb: true,
          expiryDate: true,
          autoRenew: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          domain: { select: { domainName: true, tld: true } },
        },
      }),
      this.prisma.hostingAccount.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Support Tickets ────────────────────────────────────────────────────────

  async getAllTickets(query: AdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where['status'] = query.status as TicketStatus;
    }

    if (query.search) {
      where['OR'] = [
        { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          user: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async assignTicket(id: string, agentId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with id "${id}" not found`);
    }

    // Validate agent exists
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
      select: { id: true, role: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with id "${agentId}" not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedTo: agentId,
        status: TicketStatus.IN_PROGRESS,
      },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        assignedTo: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Ticket ${id} assigned to agent ${agentId}`);
    return updated;
  }

  // ─── Revenue Summary ────────────────────────────────────────────────────────

  async getRevenueSummary(query: AdminQueryDto): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    data: RevenueDataPoint[];
  }> {
    const groupBy = query.groupBy ?? 'month';
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 12));
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { amountNpr: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amountNpr, 0);
    const totalTransactions = payments.length;

    // Group payments
    const map = new Map<string, { revenue: number; orderCount: number }>();

    for (const p of payments) {
      let key: string;
      const d = p.createdAt;

      if (groupBy === 'day') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        // ISO week: Monday-based
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = map.get(key) ?? { revenue: 0, orderCount: 0 };
      existing.revenue += p.amountNpr;
      existing.orderCount += 1;
      map.set(key, existing);
    }

    const data = Array.from(map.entries()).map(([period, stats]) => ({
      period,
      revenue: stats.revenue,
      orderCount: stats.orderCount,
    }));

    return { totalRevenue, totalTransactions, data };
  }

  // ─── Promo Codes ────────────────────────────────────────────────────────────

  async createPromoCode(dto: CreatePromoCodeDto) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase() },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Promo code "${dto.code}" already exists`);
    }

    const now = new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const promoCode = await this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxUses: dto.maxUses ?? null,
        minOrderAmount: dto.minOrderAmount ?? null,
        validFrom: now,
        validUntil: expiresAt,
        status: dto.isActive === false ? PromoStatus.INACTIVE : PromoStatus.ACTIVE,
      },
    });

    this.logger.log(`Promo code created: ${promoCode.code} (${dto.discountType}: ${dto.discountValue})`);
    return promoCode;
  }

  async getPromoCodes() {
    const promoCodes = await this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return promoCodes;
  }

  async updatePromoCode(id: string, dto: Partial<CreatePromoCodeDto>) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Promo code with id "${id}" not found`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.discountType !== undefined) updateData['discountType'] = dto.discountType;
    if (dto.discountValue !== undefined) updateData['discountValue'] = dto.discountValue;
    if (dto.maxUses !== undefined) updateData['maxUses'] = dto.maxUses;
    if (dto.minOrderAmount !== undefined) updateData['minOrderAmount'] = dto.minOrderAmount;
    if (dto.expiresAt !== undefined) updateData['validUntil'] = new Date(dto.expiresAt);
    if (dto.isActive !== undefined) {
      updateData['status'] = dto.isActive ? PromoStatus.ACTIVE : PromoStatus.INACTIVE;
    }

    const updated = await this.prisma.promoCode.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Promo code ${id} updated`);
    return updated;
  }

  async deletePromoCode(id: string) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { id },
      select: { id: true, code: true },
    });

    if (!existing) {
      throw new NotFoundException(`Promo code with id "${id}" not found`);
    }

    await this.prisma.promoCode.delete({ where: { id } });

    this.logger.log(`Promo code ${existing.code} (${id}) deleted`);
    return { success: true };
  }

  // ─── Broadcast Notification ─────────────────────────────────────────────────

  async broadcastNotification(
    title: string,
    message: string,
    category: NotificationCategory,
  ): Promise<{ created: number }> {
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true },
    });

    if (users.length === 0) {
      this.logger.warn('broadcastNotification: no active users found');
      return { created: 0 };
    }

    const now = new Date();
    const notifications = users.map((u) => ({
      userId: u.id,
      type: NotificationType.IN_APP,
      category,
      title,
      message,
      sentAt: now,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications,
      skipDuplicates: false,
    });

    this.logger.log(
      `Broadcast notification sent to ${result.count} users: [${category}] ${title}`,
    );
    return { created: result.count };
  }

  // ─── Site Config (file-based) ──────────────────────────────────────────────

  private readonly configPath = path.join(process.cwd(), 'site-config.json');

  private readonly defaultConfig = {
    whatsappNumber: '9779802348957',
    whatsappMessage: 'Hello Hosting Nepal! I need help with your hosting services.',
    whatsappEnabled: true,
  };

  async getSiteConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return { ...this.defaultConfig, ...JSON.parse(data) };
      }
    } catch (e) {
      this.logger.warn('Failed to read site config, using defaults');
    }
    return this.defaultConfig;
  }

  async updateSiteConfig(config: Record<string, any>) {
    const current = await this.getSiteConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2));
    this.logger.log('Site config updated');
    return updated;
  }
}
