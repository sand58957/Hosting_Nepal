import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from '../../database/prisma.service';
import { BlogPostController } from './blog-post.controller';
import { BlogPostService } from './blog-post.service';
import { BlogCategoryController } from './blog-category.controller';
import { BlogCategoryService } from './blog-category.service';
import { BlogTagController } from './blog-tag.controller';
import { BlogTagService } from './blog-tag.service';
import { BlogSeoController } from './blog-seo.controller';
import { BlogAiController } from './blog-ai.controller';
import { BlogAiService } from './blog-ai.service';
import { BlogAuthorController } from './blog-author.controller';
import { BlogAuthorService } from './blog-author.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    BlogPostController,
    BlogCategoryController,
    BlogTagController,
    BlogSeoController,
    BlogAiController,
    BlogAuthorController,
  ],
  providers: [
    BlogPostService,
    BlogCategoryService,
    BlogTagService,
    BlogAiService,
    BlogAuthorService,
    PrismaService,
  ],
  exports: [BlogPostService, BlogCategoryService, BlogTagService, BlogAuthorService],
})
export class BlogModule {}
