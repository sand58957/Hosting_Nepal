import { Controller, Get, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { BlogPostService } from './blog-post.service';
import { BlogCategoryService } from './blog-category.service';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

@ApiTags('Blog SEO')
@Controller('blog')
export class BlogSeoController {
  private sitemapCache: { xml: string; expires: number } | null = null;

  constructor(
    private readonly postService: BlogPostService,
    private readonly categoryService: BlogCategoryService,
    private readonly config: ConfigService,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Generate XML sitemap for blog' })
  async sitemap(@Res() res: Response) {
    if (this.sitemapCache && Date.now() < this.sitemapCache.expires) {
      return res.send(this.sitemapCache.xml);
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const [posts, categories] = await Promise.all([
      this.postService.getPublishedSlugs(),
      this.categoryService.findAll(),
    ]);

    const parts: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      `  <url><loc>${escapeXml(frontendUrl)}/articles</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ];

    for (const post of posts) {
      parts.push(`  <url><loc>${escapeXml(frontendUrl)}/articles/${escapeXml(post.slug)}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`);
    }

    for (const cat of categories) {
      parts.push(`  <url><loc>${escapeXml(frontendUrl)}/articles/category/${escapeXml(cat.slug)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
    }

    parts.push(`</urlset>`);

    const xml = parts.join('\n');

    this.sitemapCache = { xml, expires: Date.now() + 5 * 60 * 1000 };

    res.send(xml);
  }
}
