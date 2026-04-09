import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { BlogTagService } from './blog-tag.service';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Blog Tags')
@Controller('blog/tags')
export class BlogTagController {
  constructor(private readonly tagService: BlogTagService) {}

  @Get()
  @ApiOperation({ summary: 'List all blog tags' })
  async findAll() {
    return this.tagService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blog tag' })
  async create(@Body() dto: CreateBlogTagDto) {
    return this.tagService.create(dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a blog tag' })
  async delete(@Param('id') id: string) {
    return this.tagService.delete(id);
  }
}
