import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { BlogCategoryService } from './blog-category.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Blog Categories')
@Controller('blog/categories')
export class BlogCategoryController {
  constructor(private readonly categoryService: BlogCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all blog categories' })
  async findAll() {
    return this.categoryService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blog category' })
  async create(@Body() dto: CreateBlogCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog category' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateBlogCategoryDto>) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a blog category' })
  async delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
