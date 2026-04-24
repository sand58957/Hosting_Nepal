import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BlogAuthorService } from './blog-author.service';

@ApiTags('Blog Authors')
@Controller('blog/authors')
export class BlogAuthorController {
  constructor(private readonly service: BlogAuthorService) {}

  @Get()
  @ApiOperation({ summary: 'List public authors with at least one published post' })
  async list() {
    return this.service.listPublic();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single author profile + their published posts' })
  async findOne(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}
