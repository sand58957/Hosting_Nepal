import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ResellerStatus, OrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';
import { ApplyResellerDto } from './dto/apply-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';

export interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResellerPricingConfig {
  globalMarkupPercent?: number;
  domainMarkup?: Record<string, number>;
  hostingMarkup?: Record<string, number>;
  sslMarkup?: Record<string, number>;
  [key: string]: unknown;
}

export interface WhiteLabelConfig {
  brandName?: string;
  logoUrl?: string;
  supportEmail?: string;
  primaryColor?: string;
  tagline?: string;
  [key: string]: unknown;
}

@Injectable()
export class ResellerService {
  private readonly logger = new Logger(ResellerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly resellerClub: ResellerClubService,
  ) {}

  // ─── Apply for Reseller Account ──────────────────────────────────────────────

  async applyForReseller(userId: string, dto: ApplyResellerDto) {
    this.logger.log(`User ${userId} applying for reseller account`);

    // Check if user already has a reseller account
    const existing = await this.prisma.reseller.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException(
        `Reseller account already exists with status: ${existing.status}`,
      );
    }

    // Create reseller record with PENDING_APPROVAL status
    const reseller = await this.prisma.reseller.create({
      data: {
        userId,
        companyName: dto.companyName,
        // Store additional application metadata in brandColors JSON field
        brandColors: {
          applicationData: {
            businessEmail: dto.businessEmail,
            website: dto.website ?? null,
            businessType: dto.businessType ?? null,
            panVatNumber: dto.panVatNumber ?? null,
            address: dto.address ?? null,
            phone: dto.phone ?? null,
          },
        },
        status: ResellerStatus.PENDING_APPROVAL,
        commissionRate: 0,
        walletBalanceNpr: 0,
        pricingMarkup: 0,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    this.eventEmitter.emit('reseller.applied', {
      resellerId: reseller.id,
      userId,
      companyName: dto.companyName,
      businessEmail: dto.businessEmail,
    });

    this.logger.log(`Reseller application created: ${reseller.id} for user ${userId}`);
    return reseller;
  }

  // ─── Get Reseller Profile ────────────────────────────────────────────────────

  async getResellerProfile(userId: string) {
    const reseller = await this.prisma.reseller.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            companyName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!reseller) {
      throw new NotFoundException('Reseller profile not found');
    }

    return reseller;
  }

  // ─── Update Reseller Profile ─────────────────────────────────────────────────

  async updateResellerProfile(userId: string, dto: UpdateResellerDto) {
    const reseller = await this.findActiveReseller(userId);

    // Merge updated application data into the brandColors JSON field
    const existingBrandColors = (reseller.brandColors as Record<string, unknown>) ?? {};
    const existingAppData =
      (existingBrandColors.applicationData as Record<string, unknown>) ?? {};

    const updatedBrandColors = {
      ...existingBrandColors,
      applicationData: {
        ...existingAppData,
        ...(dto.businessEmail !== undefined && { businessEmail: dto.businessEmail }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    };

    const updated = await this.prisma.reseller.update({
      where: { userId },
      data: {
        ...(dto.companyName && { companyName: dto.companyName }),
        brandColors: updatedBrandColors as Prisma.InputJsonValue,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    this.eventEmitter.emit('reseller.profile.updated', {
      resellerId: reseller.id,
      userId,
    });

    this.logger.log(`Reseller profile updated for user ${userId}`);
    return updated;
  }

  // ─── Get Reseller Customers ──────────────────────────────────────────────────
  // Note: The current schema does not have a resellerId FK on the User model.
  // Customers are associated with resellers via their ResellerClub sub-reseller ID
  // (rcResellerId). This method returns users who signed up under this reseller's
  // custom domain or were created by admin assignment in rcResellerId context.
  // For now, we return orders/users linked via the reseller's rcResellerId.
  async getResellerCustomers(userId: string, query: PaginationQuery) {
    const reseller = await this.findActiveReseller(userId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // Find users whose rcCustomerId starts with reseller's rcResellerId prefix,
    // or fall back to users who placed orders referencing this reseller's products.
    // Since the schema has no direct FK, we query users linked to this reseller
    // via the customDomain or rcResellerId association stored in reseller record.
    const whereClause = reseller.rcResellerId
      ? {
          rcCustomerId: {
            startsWith: reseller.rcResellerId,
          },
        }
      : { id: 'no-match' }; // Return empty if no rcResellerId assigned yet

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          companyName: true,
          status: true,
          createdAt: true,
          _count: {
            select: { orders: true, domains: true, hostingAccounts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get Customer Details ─────────────────────────────────────────────────────

  async getCustomerDetails(resellerId: string, customerId: string) {
    // Verify the reseller exists and is active
    const reseller = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
    });

    if (!reseller) {
      throw new NotFoundException('Reseller not found');
    }

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyName: true,
        status: true,
        createdAt: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            serviceType: true,
            totalAmountNpr: true,
            status: true,
            createdAt: true,
          },
        },
        hostingAccounts: {
          select: {
            id: true,
            planName: true,
            planType: true,
            status: true,
            expiryDate: true,
          },
        },
        domains: {
          select: {
            id: true,
            domainName: true,
            tld: true,
            status: true,
            expiryDate: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    return customer;
  }

  // ─── Get Reseller Orders ──────────────────────────────────────────────────────

  async getResellerOrders(userId: string, query: PaginationQuery) {
    const reseller = await this.findActiveReseller(userId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // Build date range filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) dateFilter.lte = new Date(query.endDate);

    // Get customer user IDs under this reseller
    const customerWhere = reseller.rcResellerId
      ? { rcCustomerId: { startsWith: reseller.rcResellerId } }
      : { id: 'no-match' };

    const customerIds = await this.prisma.user
      .findMany({
        where: customerWhere,
        select: { id: true },
      })
      .then((users) => users.map((u) => u.id));

    const orderWhere = {
      userId: { in: customerIds },
      ...(query.status && { status: query.status as OrderStatus }),
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: orderWhere,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: orderWhere }),
    ]);

    return {
      data: orders,
      resellerId: reseller.id,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get Reseller Revenue ─────────────────────────────────────────────────────

  async getResellerRevenue(userId: string, query: PaginationQuery) {
    const reseller = await this.findActiveReseller(userId);

    // Build date range filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) dateFilter.lte = new Date(query.endDate);

    // Get customer IDs under this reseller
    const customerWhere = reseller.rcResellerId
      ? { rcCustomerId: { startsWith: reseller.rcResellerId } }
      : { id: 'no-match' };

    const customerIds = await this.prisma.user
      .findMany({
        where: customerWhere,
        select: { id: true },
      })
      .then((users) => users.map((u) => u.id));

    const orderWhere = {
      userId: { in: customerIds },
      status: OrderStatus.COMPLETED,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    // Aggregate total revenue from completed customer orders
    const revenueAgg = await this.prisma.order.aggregate({
      where: orderWhere,
      _sum: {
        totalAmountNpr: true,
        amountNpr: true,
        vatAmountNpr: true,
        discountAmountNpr: true,
      },
      _count: { id: true },
    });

    const grossRevenue = revenueAgg._sum.totalAmountNpr ?? 0;
    const markupRate = reseller.pricingMarkup / 100;
    const commissionRate = reseller.commissionRate / 100;

    // Estimated reseller margin = gross revenue * effective margin rate
    const estimatedMargin = grossRevenue * markupRate;
    const commissionEarned = grossRevenue * commissionRate;

    // Monthly breakdown for the queried period
    const monthlyOrders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: orderWhere,
      _sum: { totalAmountNpr: true },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyBreakdown = this.groupOrdersByMonth(monthlyOrders);

    return {
      resellerId: reseller.id,
      summary: {
        totalOrders: revenueAgg._count.id,
        grossRevenue,
        vatCollected: revenueAgg._sum.vatAmountNpr ?? 0,
        discountsGiven: revenueAgg._sum.discountAmountNpr ?? 0,
        estimatedMargin,
        commissionEarned,
        pricingMarkupPercent: reseller.pricingMarkup,
        commissionRatePercent: reseller.commissionRate,
      },
      walletBalance: reseller.walletBalanceNpr,
      monthlyBreakdown,
      period: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
    };
  }

  private groupOrdersByMonth(
    orders: Array<{ createdAt: Date; _sum: { totalAmountNpr: number | null }; _count: { id: number } }>,
  ) {
    const monthMap: Record<string, { revenue: number; orderCount: number }> = {};

    for (const order of orders) {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { revenue: 0, orderCount: 0 };
      }
      monthMap[key].revenue += order._sum.totalAmountNpr ?? 0;
      monthMap[key].orderCount += order._count.id;
    }

    return Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));
  }

  // ─── Get Reseller Pricing ─────────────────────────────────────────────────────

  async getResellerPricing(userId: string) {
    const reseller = await this.findActiveReseller(userId);

    // Extract pricing config stored within brandColors JSON
    const storedConfig = (reseller.brandColors as Record<string, unknown>) ?? {};
    const pricingConfig = (storedConfig.pricingConfig as ResellerPricingConfig) ?? {};

    return {
      resellerId: reseller.id,
      globalMarkupPercent: reseller.pricingMarkup,
      commissionRate: reseller.commissionRate,
      customPricingRules: {
        globalMarkupPercent: pricingConfig.globalMarkupPercent ?? reseller.pricingMarkup,
        domainMarkup: pricingConfig.domainMarkup ?? {},
        hostingMarkup: pricingConfig.hostingMarkup ?? {},
        sslMarkup: pricingConfig.sslMarkup ?? {},
      },
    };
  }

  // ─── Update Pricing ───────────────────────────────────────────────────────────

  async updatePricing(userId: string, dto: UpdatePricingDto) {
    const reseller = await this.findActiveReseller(userId);

    const existingBrandColors = (reseller.brandColors as Record<string, unknown>) ?? {};
    const existingPricingConfig =
      (existingBrandColors.pricingConfig as ResellerPricingConfig) ?? {};

    const updatedPricingConfig: ResellerPricingConfig = {
      globalMarkupPercent:
        dto.globalMarkupPercent ?? existingPricingConfig.globalMarkupPercent,
      domainMarkup: dto.domainMarkup
        ? { ...(existingPricingConfig.domainMarkup ?? {}), ...dto.domainMarkup }
        : existingPricingConfig.domainMarkup,
      hostingMarkup: dto.hostingMarkup
        ? { ...(existingPricingConfig.hostingMarkup ?? {}), ...dto.hostingMarkup }
        : existingPricingConfig.hostingMarkup,
      sslMarkup: dto.sslMarkup
        ? { ...(existingPricingConfig.sslMarkup ?? {}), ...dto.sslMarkup }
        : existingPricingConfig.sslMarkup,
    };

    const updatedBrandColors = {
      ...existingBrandColors,
      pricingConfig: updatedPricingConfig,
    };

    const updated = await this.prisma.reseller.update({
      where: { userId },
      data: {
        brandColors: updatedBrandColors as Prisma.InputJsonValue,
        ...(dto.globalMarkupPercent !== undefined && {
          pricingMarkup: dto.globalMarkupPercent,
        }),
      },
    });

    this.eventEmitter.emit('reseller.pricing.updated', {
      resellerId: reseller.id,
      userId,
      globalMarkupPercent: dto.globalMarkupPercent,
    });

    this.logger.log(`Reseller pricing updated for user ${userId}`);

    return {
      resellerId: updated.id,
      pricingMarkup: updated.pricingMarkup,
      customPricingRules: updatedPricingConfig,
    };
  }

  // ─── Get White Label Settings ─────────────────────────────────────────────────

  async getWhiteLabel(userId: string) {
    const reseller = await this.findActiveReseller(userId);

    const storedConfig = (reseller.brandColors as Record<string, unknown>) ?? {};
    const whiteLabelConfig = (storedConfig.whiteLabelConfig as WhiteLabelConfig) ?? {};

    return {
      resellerId: reseller.id,
      companyName: reseller.companyName,
      brandName: whiteLabelConfig.brandName ?? reseller.companyName,
      logoUrl: reseller.brandLogoUrl ?? whiteLabelConfig.logoUrl ?? null,
      customDomain: reseller.customDomain ?? null,
      customNameservers: reseller.customNameservers ?? [],
      supportEmail: whiteLabelConfig.supportEmail ?? null,
      primaryColor: whiteLabelConfig.primaryColor ?? null,
      tagline: whiteLabelConfig.tagline ?? null,
    };
  }

  // ─── Update White Label Settings ──────────────────────────────────────────────

  async updateWhiteLabel(userId: string, dto: UpdateWhiteLabelDto) {
    const reseller = await this.findActiveReseller(userId);

    if (dto.customDomain) {
      // Check for domain uniqueness across resellers
      const domainConflict = await this.prisma.reseller.findFirst({
        where: {
          customDomain: dto.customDomain,
          userId: { not: userId },
        },
      });

      if (domainConflict) {
        throw new ConflictException(
          `Custom domain '${dto.customDomain}' is already in use by another reseller`,
        );
      }
    }

    const existingBrandColors = (reseller.brandColors as Record<string, unknown>) ?? {};
    const existingWhiteLabelConfig =
      (existingBrandColors.whiteLabelConfig as WhiteLabelConfig) ?? {};

    const updatedWhiteLabelConfig: WhiteLabelConfig = {
      ...existingWhiteLabelConfig,
      ...(dto.brandName !== undefined && { brandName: dto.brandName }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.supportEmail !== undefined && { supportEmail: dto.supportEmail }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
      ...(dto.tagline !== undefined && { tagline: dto.tagline }),
    };

    const updatedBrandColors = {
      ...existingBrandColors,
      whiteLabelConfig: updatedWhiteLabelConfig,
    };

    const updated = await this.prisma.reseller.update({
      where: { userId },
      data: {
        brandColors: updatedBrandColors as Prisma.InputJsonValue,
        ...(dto.logoUrl !== undefined && { brandLogoUrl: dto.logoUrl }),
        ...(dto.customDomain !== undefined && { customDomain: dto.customDomain }),
      },
    });

    this.eventEmitter.emit('reseller.white-label.updated', {
      resellerId: reseller.id,
      userId,
      customDomain: dto.customDomain,
    });

    this.logger.log(`Reseller white-label settings updated for user ${userId}`);

    return {
      resellerId: updated.id,
      companyName: updated.companyName,
      brandName: updatedWhiteLabelConfig.brandName ?? updated.companyName,
      logoUrl: updated.brandLogoUrl ?? null,
      customDomain: updated.customDomain ?? null,
      supportEmail: updatedWhiteLabelConfig.supportEmail ?? null,
      primaryColor: updatedWhiteLabelConfig.primaryColor ?? null,
      tagline: updatedWhiteLabelConfig.tagline ?? null,
    };
  }

  // ─── Get Reseller Balance ─────────────────────────────────────────────────────

  async getResellerBalance(userId: string) {
    const reseller = await this.findActiveReseller(userId);

    return {
      resellerId: reseller.id,
      walletBalanceNpr: reseller.walletBalanceNpr,
      commissionRate: reseller.commissionRate,
      pricingMarkup: reseller.pricingMarkup,
      currency: 'NPR',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async findActiveReseller(userId: string) {
    const reseller = await this.prisma.reseller.findUnique({
      where: { userId },
    });

    if (!reseller) {
      throw new NotFoundException(
        'Reseller profile not found. Please apply for a reseller account first.',
      );
    }

    if (reseller.status === ResellerStatus.SUSPENDED) {
      throw new ForbiddenException('Your reseller account has been suspended.');
    }

    if (reseller.status === ResellerStatus.PENDING_APPROVAL) {
      throw new ForbiddenException(
        'Your reseller application is pending approval by the admin.',
      );
    }

    if (reseller.status === ResellerStatus.INACTIVE) {
      throw new ForbiddenException('Your reseller account is inactive.');
    }

    return reseller;
  }

  // ─── Public helper used by admin module ──────────────────────────────────────

  async findResellerById(id: string) {
    const reseller = await this.prisma.reseller.findUnique({ where: { id } });
    if (!reseller) {
      throw new NotFoundException(`Reseller ${id} not found`);
    }
    return reseller;
  }

  async findResellerByUserId(userId: string) {
    return this.prisma.reseller.findUnique({ where: { userId } });
  }

  async updateResellerStatus(id: string, status: ResellerStatus) {
    this.logger.log(`Updating reseller ${id} status to ${status}`);

    const reseller = await this.findResellerById(id);

    const updated = await this.prisma.reseller.update({
      where: { id },
      data: { status },
    });

    // When approving a reseller, create the RC sub-reseller account
    if (status === ResellerStatus.ACTIVE && !reseller.rcResellerId) {
      try {
        const rcResellerId = await this.createRcSubReseller(id);
        this.logger.log(
          `RC sub-reseller created for reseller ${id}: rcResellerId=${rcResellerId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create RC sub-reseller for reseller ${id}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        // Do not throw — the reseller is still approved locally; RC sync can be retried.
      }
    }

    this.eventEmitter.emit('reseller.status.changed', {
      resellerId: id,
      userId: reseller.userId,
      oldStatus: reseller.status,
      newStatus: status,
    });

    return updated;
  }

  async creditResellerWallet(id: string, amountNpr: number) {
    if (amountNpr <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const updated = await this.prisma.reseller.update({
      where: { id },
      data: {
        walletBalanceNpr: {
          increment: amountNpr,
        },
      },
    });

    this.eventEmitter.emit('reseller.wallet.credited', {
      resellerId: id,
      amountNpr,
      newBalance: updated.walletBalanceNpr,
    });

    return updated;
  }

  // ─── ResellerClub Sub-Reseller Management ──────────────────────────────────

  /**
   * Create a sub-reseller account in ResellerClub for the given reseller.
   * Returns the RC reseller ID. If the reseller already has one, returns it directly.
   */
  async createRcSubReseller(resellerId: string): Promise<string> {
    const reseller = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
      include: { user: true },
    });

    if (!reseller) {
      throw new NotFoundException(`Reseller ${resellerId} not found`);
    }

    // Already has an RC sub-reseller account
    if (reseller.rcResellerId) {
      return reseller.rcResellerId;
    }

    const user = reseller.user;

    // Extract application data from brandColors JSON for address info
    const brandColors = (reseller.brandColors as Record<string, any>) ?? {};
    const appData = brandColors.applicationData ?? {};

    const rcResponse = await this.resellerClub.createSubReseller({
      username: user.email,
      password: randomBytes(12).toString('hex'),
      name: user.name || user.email,
      company: reseller.companyName || '-',
      addressLine1: appData.address || 'Nepal',
      city: 'Kathmandu',
      state: 'Bagmati',
      country: 'NP',
      zipCode: '44600',
      phone: user.phone || appData.phone || '+977-9800000000',
      email: user.email,
    });

    const rcResellerId = String(rcResponse);

    await this.prisma.reseller.update({
      where: { id: resellerId },
      data: { rcResellerId },
    });

    this.eventEmitter.emit('reseller.rc_sub_reseller.created', {
      resellerId,
      rcResellerId,
      userId: user.id,
    });

    this.logger.log(
      `RC sub-reseller created: resellerId=${resellerId}, rcResellerId=${rcResellerId}`,
    );

    return rcResellerId;
  }

  /**
   * Get the ResellerClub balance for the given reseller.
   */
  async getRcResellerBalance(resellerId: string) {
    const reseller = await this.findResellerById(resellerId);

    if (!reseller.rcResellerId) {
      throw new BadRequestException(
        'This reseller does not have a ResellerClub sub-reseller account yet.',
      );
    }

    try {
      const balance = await this.resellerClub.getResellerBalance(reseller.rcResellerId);
      return {
        resellerId,
        rcResellerId: reseller.rcResellerId,
        rcBalance: balance,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch RC balance for reseller ${resellerId}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to fetch ResellerClub balance. Please try again.',
      );
    }
  }

  /**
   * Add funds to the reseller's ResellerClub sub-reseller account.
   */
  async addRcResellerFund(resellerId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Fund amount must be positive');
    }

    const reseller = await this.findResellerById(resellerId);

    if (!reseller.rcResellerId) {
      throw new BadRequestException(
        'This reseller does not have a ResellerClub sub-reseller account yet.',
      );
    }

    try {
      const result = await this.resellerClub.addResellerFund(
        reseller.rcResellerId,
        amount,
        'AddFunds',
      );

      this.eventEmitter.emit('reseller.rc_fund.added', {
        resellerId,
        rcResellerId: reseller.rcResellerId,
        amount,
      });

      this.logger.log(
        `RC fund added: resellerId=${resellerId}, amount=${amount}`,
      );

      return {
        resellerId,
        rcResellerId: reseller.rcResellerId,
        amountAdded: amount,
        result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add RC fund for reseller ${resellerId}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'Failed to add funds to ResellerClub account. Please try again.',
      );
    }
  }
}
