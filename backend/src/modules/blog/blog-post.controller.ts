import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { BlogPostService } from './blog-post.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogQueryDto } from './dto/blog-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Blog Posts')
@Controller('blog/posts')
export class BlogPostController {
  constructor(private readonly blogPostService: BlogPostService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post' })
  async create(@CurrentUser() user: any, @Body() dto: CreateBlogPostDto) {
    return this.blogPostService.create(user.id || user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List blog posts (public: published only, admin: all)' })
  async findAll(@Query() query: BlogQueryDto) {
    return this.blogPostService.findAll(query, false);
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all blog posts (admin view)' })
  async findAllAdmin(@Query() query: BlogQueryDto) {
    return this.blogPostService.findAll(query, true);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single blog post by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogPostService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogPostService.update(id, dto);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a blog post' })
  async publish(@Param('id') id: string) {
    return this.blogPostService.publish(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a blog post' })
  async delete(@Param('id') id: string) {
    return this.blogPostService.softDelete(id);
  }
}
