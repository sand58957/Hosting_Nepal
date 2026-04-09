import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { generateSlug } from './utils/slug.util';

@Injectable()
export class BlogCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBlogCategoryDto) {
    const slug = generateSlug(dto.name);

    const existing = await this.prisma.blogCategory.findUnique({ where: { slug } });

    if (existing) throw new ConflictException('Category with this name already exists');

    return this.prisma.blogCategory.create({
      data: { name: dto.name, slug, description: dto.description, parentId: dto.parentId },
    });
  }

  async findAll() {
    return this.prisma.blogCategory.findMany({
      include: {
        _count: { select: { posts: true } },
        children: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: Partial<CreateBlogCategoryDto>) {
    const cat = await this.prisma.blogCategory.findUnique({ where: { id } });

    if (!cat) throw new NotFoundException('Category not found');

    const data: any = { ...dto };

    if (dto.name) data.slug = generateSlug(dto.name);

    return this.prisma.blogCategory.update({ where: { id }, data });
  }

  async delete(id: string) {
    const cat = await this.prisma.blogCategory.findUnique({ where: { id } });

    if (!cat) throw new NotFoundException('Category not found');

    return this.prisma.blogCategory.delete({ where: { id } });
  }
}
