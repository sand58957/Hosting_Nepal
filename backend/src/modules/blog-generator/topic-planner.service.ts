import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { ANGLE_SEEDS, CATEGORY_SEEDS, INTENT_SEEDS, TopicKernel } from './seed-topics';

@Injectable()
export class TopicPlannerService {
  private readonly logger = new Logger(TopicPlannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  pickKernel(): TopicKernel {
    return {
      category: pick(CATEGORY_SEEDS),
      intent: pick(INTENT_SEEDS),
      angle: pick(ANGLE_SEEDS),
    };
  }

  async recentPostTitles(limit = 200): Promise<string[]> {
    const posts = await this.prisma.blogPost.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { title: true },
    });

    return posts.map(p => p.title);
  }

  async existingSlug(slug: string): Promise<boolean> {
    const post = await this.prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });

    return !!post;
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
