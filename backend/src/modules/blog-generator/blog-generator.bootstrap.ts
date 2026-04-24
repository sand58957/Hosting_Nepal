import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../database/prisma.service';
import {
  BLOG_GENERATOR_JOBS,
  BLOG_GENERATOR_QUEUE,
  BLOG_GENERATOR_REPEAT_KEYS,
  BOT_USER_EMAIL_DEFAULT,
  BOT_USER_NAME,
} from './constants';
import { CATEGORY_SEEDS } from './seed-topics';

@Injectable()
export class BlogGeneratorBootstrap implements OnModuleInit {
  private readonly logger = new Logger(BlogGeneratorBootstrap.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(BLOG_GENERATOR_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.ensureBotUser();
    await this.ensureCategories();
    await this.reconcileRepeatableJobs();
  }

  private async ensureBotUser() {
    const email = this.config.get<string>('BLOG_AUTOGEN_BOT_EMAIL') || BOT_USER_EMAIL_DEFAULT;
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });

    let userId = existing?.id;

    if (!userId) {
      const passwordHash = await bcrypt.hash(`bot-${Date.now()}-${Math.random().toString(36).slice(2)}`, 10);

      const created = await this.prisma.user.create({
        data: {
          email,
          name: BOT_USER_NAME,
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
        select: { id: true },
      });

      userId = created.id;
      this.logger.log(`Seeded bot user ${email} -> ${userId}`);
    }

    if (this.config.get<string>('BLOG_BOT_USER_ID') !== userId) {
      process.env.BLOG_BOT_USER_ID = userId;
    }
  }

  private async ensureCategories() {
    for (const seed of CATEGORY_SEEDS) {
      await this.prisma.blogCategory.upsert({
        where: { slug: seed.slug },
        create: { name: seed.name, slug: seed.slug, description: seed.description },
        update: { name: seed.name, description: seed.description },
      });
    }
  }

  private async reconcileRepeatableJobs() {
    const enabled = this.config.get<string>('BLOG_AUTOGEN_ENABLED') === 'true';
    const existing = await this.queue.getRepeatableJobs();

    for (const job of existing) {
      if (job.name === BLOG_GENERATOR_JOBS.GENERATE) {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    if (!enabled) {
      this.logger.log('BLOG_AUTOGEN_ENABLED=false; no repeatable jobs scheduled');

      return;
    }

    await this.queue.add(
      BLOG_GENERATOR_JOBS.GENERATE,
      { source: BLOG_GENERATOR_REPEAT_KEYS.HOURLY },
      { repeat: { cron: '0 * * * *' }, jobId: BLOG_GENERATOR_REPEAT_KEYS.HOURLY },
    );

    await this.queue.add(
      BLOG_GENERATOR_JOBS.GENERATE,
      { source: BLOG_GENERATOR_REPEAT_KEYS.EXTRA },
      { repeat: { cron: '30 12 * * *' }, jobId: BLOG_GENERATOR_REPEAT_KEYS.EXTRA },
    );

    this.logger.log('Scheduled auto-blog cron: hourly + daily 12:30 (25 posts/day)');
  }
}
