import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { BlogPostStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { generateSlug, generateUniqueSlug } from './utils/slug.util';

const DEFAULT_TITLE = 'Editorial Team';
const DEFAULT_BIO =
  'Part of the Hosting Nepal editorial team covering web hosting, domains, VPS, and local payment workflows for Nepali businesses. Based in Kathmandu.';

@Injectable()
export class BlogAuthorService implements OnModuleInit {
  private readonly logger = new Logger(BlogAuthorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.backfillAuthorProfiles();
  }

  async listPublic() {
    const authors = await this.prisma.user.findMany({
      where: {
        authorSlug: { not: null },
        blogPosts: { some: { status: BlogPostStatus.PUBLISHED, deletedAt: null } },
      },
      select: {
        id: true,
        name: true,
        authorSlug: true,
        authorTitle: true,
        authorBio: true,
        avatarUrl: true,
        _count: { select: { blogPosts: { where: { status: BlogPostStatus.PUBLISHED, deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });

    return authors.map(a => ({
      id: a.id,
      name: a.name,
      slug: a.authorSlug,
      title: a.authorTitle,
      bio: a.authorBio,
      avatarUrl: a.avatarUrl,
      postCount: a._count.blogPosts,
    }));
  }

  async findBySlug(slug: string) {
    const author = await this.prisma.user.findUnique({
      where: { authorSlug: slug },
      select: {
        id: true,
        name: true,
        authorSlug: true,
        authorTitle: true,
        authorBio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!author) throw new NotFoundException('Author not found');

    const posts = await this.prisma.blogPost.findMany({
      where: { authorId: author.id, status: BlogPostStatus.PUBLISHED, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        readTime: true,
        publishedAt: true,
        views: true,
        category: { select: { name: true, slug: true } },
      },
    });

    const totalPosts = await this.prisma.blogPost.count({
      where: { authorId: author.id, status: BlogPostStatus.PUBLISHED, deletedAt: null },
    });

    const jsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: author.name,
      jobTitle: author.authorTitle || DEFAULT_TITLE,
      description: author.authorBio || DEFAULT_BIO,
      image: author.avatarUrl || undefined,
      url: `https://hostingnepals.com/authors/${author.authorSlug}`,
      worksFor: {
        '@type': 'Organization',
        name: 'Hosting Nepal',
        url: 'https://hostingnepals.com',
      },
    };

    return {
      author: {
        id: author.id,
        name: author.name,
        slug: author.authorSlug,
        title: author.authorTitle,
        bio: author.authorBio,
        avatarUrl: author.avatarUrl,
        joinedAt: author.createdAt,
      },
      posts,
      totalPosts,
      jsonLd,
    };
  }

  async topAuthors(limit = 5) {
    const grouped = await this.prisma.blogPost.groupBy({
      by: ['authorId'],
      where: { deletedAt: null },
      _count: { _all: true },
      _sum: { views: true },
    });

    const sorted = grouped
      .sort((a, b) => (b._count._all - a._count._all))
      .slice(0, limit);

    if (!sorted.length) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: sorted.map(g => g.authorId) } },
      select: { id: true, name: true, authorSlug: true, authorTitle: true, avatarUrl: true },
    });

    return sorted.map(g => {
      const user = users.find(u => u.id === g.authorId);

      return {
        id: g.authorId,
        name: user?.name || 'Unknown',
        slug: user?.authorSlug || null,
        title: user?.authorTitle || null,
        avatarUrl: user?.avatarUrl || null,
        postCount: g._count._all,
        totalViews: g._sum.views || 0,
      };
    });
  }

  private async backfillAuthorProfiles() {
    const candidates = await this.prisma.user.findMany({
      where: {
        authorSlug: null,
        blogPosts: { some: {} },
      },
      select: { id: true, name: true, email: true },
    });

    if (!candidates.length) return;

    this.logger.log(`Backfilling author profiles for ${candidates.length} user(s)`);

    for (const user of candidates) {
      const base = generateSlug(user.name || user.email.split('@')[0] || 'author').slice(0, 80);

      let slug = base || 'author';
      let tries = 0;

      while (tries < 5) {
        const collision = await this.prisma.user.findUnique({ where: { authorSlug: slug }, select: { id: true } });

        if (!collision) break;
        slug = generateUniqueSlug(base).slice(0, 80);
        tries++;
      }

      const isGenericAdmin = !user.name || user.name.trim().toLowerCase() === 'admin';
      const newName = isGenericAdmin ? 'Hosting Nepal Editorial' : user.name;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          authorSlug: slug,
          authorTitle: DEFAULT_TITLE,
          authorBio: DEFAULT_BIO,
          ...(isGenericAdmin ? { name: newName } : {}),
        },
      });
    }
  }
}
