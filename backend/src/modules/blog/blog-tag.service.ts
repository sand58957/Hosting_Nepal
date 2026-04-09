import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { generateSlug } from './utils/slug.util';

@Injectable()
export class BlogTagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBlogTagDto) {
    const slug = generateSlug(dto.name);

    const existing = await this.prisma.blogTag.findUnique({ where: { slug } });

    if (existing) throw new ConflictException('Tag already exists');

    return this.prisma.blogTag.create({ data: { name: dto.name, slug } });
  }

  async findAll() {
    return this.prisma.blogTag.findMany({
      include: { _count: { select: { postTags: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async delete(id: string) {
    const tag = await this.prisma.blogTag.findUnique({ where: { id } });

    if (!tag) throw new NotFoundException('Tag not found');

    return this.prisma.blogTag.delete({ where: { id } });
  }
}
