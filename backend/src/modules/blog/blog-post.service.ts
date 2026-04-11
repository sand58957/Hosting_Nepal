import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { BlogPostStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogQueryDto } from './dto/blog-query.dto';
import { generateSlug, generateUniqueSlug, calculateReadTime } from './utils/slug.util';

const BLOG_POST_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true, slug: true } },
  postTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

function flattenPostTags<T extends { postTags: { tag: any }[] }>(post: T) {
  const { postTags, ...rest } = post;

  return { ...rest, tags: postTags.map(pt => pt.tag) };
}

@Injectable()
export class BlogPostService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateBlogPostDto) {
    let slug = generateSlug(dto.title);
    const existing = await this.prisma.blogPost.findUnique({ where: { slug } });

    if (existing) slug = generateUniqueSlug(dto.title);

    const readTime = calculateReadTime(dto.content);

    const post = await this.prisma.blogPost.create({
      data: {
        slug,
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        featuredImage: dto.featuredImage,
        status: dto.status || BlogPostStatus.DRAFT,
        publishedAt: dto.status === BlogPostStatus.PUBLISHED ? new Date() : dto.publishedAt ? new Date(dto.publishedAt) : null,
        authorId,
        categoryId: dto.categoryId,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoKeywords: dto.seoKeywords,
        ogImage: dto.ogImage,
        readTime,
      },
      include: BLOG_POST_INCLUDE,
    });

    // Handle tags
    if (dto.tagIds?.length) {
      await this.prisma.blogPostTag.createMany({
        data: dto.tagIds.map(tagId => ({ postId: post.id, tagId })),
        skipDuplicates: true,
      });
    }

    return this.findById(post.id);
  }

  async findAll(query: BlogQueryDto, isAdmin = false) {
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '10'), 50);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';

    const where: any = { deletedAt: null };

    if (!isAdmin) {
      where.status = BlogPostStatus.PUBLISHED;
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.tag) {
      where.postTags = { some: { tag: { slug: query.tag } } };
    }

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: 'desc' },
        include: BLOG_POST_INCLUDE,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    const posts = data.map(flattenPostTags);

    return {
      data: posts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: BLOG_POST_INCLUDE,
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Blog post not found');
    }

    this.prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(e => {
      console.warn('View increment failed:', e.message);
    });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || '',
      image: post.ogImage || post.featuredImage || '',
      author: { '@type': 'Person', name: post.author.name },
      datePublished: post.publishedAt?.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      publisher: { '@type': 'Organization', name: 'Hosting Nepal' },
    };

    return { ...flattenPostTags(post), jsonLd };
  }

  async findById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, include: BLOG_POST_INCLUDE });

    if (!post) throw new NotFoundException('Blog post not found');

    return flattenPostTags(post);
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });

    if (!existing || existing.deletedAt) throw new NotFoundException('Blog post not found');

    const data: any = { ...dto };

    delete data.tagIds;

    if (dto.title && dto.title !== existing.title) {
      data.slug = generateSlug(dto.title);

      const slugExists = await this.prisma.blogPost.findFirst({ where: { slug: data.slug, id: { not: id } } });

      if (slugExists) data.slug = generateUniqueSlug(dto.title);
    }

    if (dto.content) {
      data.readTime = calculateReadTime(dto.content);
    }

    if (dto.publishedAt) {
      data.publishedAt = new Date(dto.publishedAt);
    }

    await this.prisma.blogPost.update({ where: { id }, data });

    // Update tags if provided
    if (dto.tagIds !== undefined) {
      await this.prisma.blogPostTag.deleteMany({ where: { postId: id } });

      if (dto.tagIds.length) {
        await this.prisma.blogPostTag.createMany({
          data: dto.tagIds.map(tagId => ({ postId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    return this.findById(id);
  }

  async publish(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });

    if (!post || post.deletedAt) throw new NotFoundException('Blog post not found');

    return this.prisma.blogPost.update({
      where: { id },
      data: { status: BlogPostStatus.PUBLISHED, publishedAt: new Date() },
      include: { author: { select: { id: true, name: true } }, category: true },
    });
  }

  async softDelete(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });

    if (!post) throw new NotFoundException('Blog post not found');

    return this.prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getPublishedSlugs() {
    return this.prisma.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getAnalytics() {
    const where = { deletedAt: null };

    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      archivedPosts,
      totalViewsResult,
      topPosts,
      categoryStats,
      recentPosts,
    ] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.count({ where: { ...where, status: BlogPostStatus.PUBLISHED } }),
      this.prisma.blogPost.count({ where: { ...where, status: BlogPostStatus.DRAFT } }),
      this.prisma.blogPost.count({ where: { ...where, status: BlogPostStatus.SCHEDULED } }),
      this.prisma.blogPost.count({ where: { ...where, status: BlogPostStatus.ARCHIVED } }),
      this.prisma.blogPost.aggregate({ where, _sum: { views: true } }),
      this.prisma.blogPost.findMany({
        where: { ...where, status: BlogPostStatus.PUBLISHED },
        orderBy: { views: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, views: true, publishedAt: true, readTime: true },
      }),
      this.prisma.blogCategory.findMany({
        select: {
          id: true, name: true, slug: true,
          posts: { where, select: { id: true } },
        },
      }),
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, views: true, createdAt: true, publishedAt: true },
      }),
    ]);

    const totalViews = totalViewsResult._sum.views || 0;
    const avgViews = publishedPosts > 0 ? Math.round(totalViews / publishedPosts) : 0;

    return {
      overview: { totalPosts, publishedPosts, draftPosts, scheduledPosts, archivedPosts, totalViews, avgViews },
      topPosts,
      categoryStats: categoryStats.map(c => ({ id: c.id, name: c.name, slug: c.slug, postCount: c.posts.length })),
      recentPosts,
    };
  }
}
