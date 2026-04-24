import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StorageService } from './storage.service';

const ALLOWED_FOLDERS = new Set([
  'blog/featured',
  'blog/og',
  'blog/content',
  'authors/avatars',
  'users/avatars',
  'misc',
]);

@ApiTags('Storage')
@Controller('storage')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image to Cloudflare R2 (admin only)' })
  async upload(
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number } | undefined,
    @Query('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided (field name: "file")');

    const targetFolder = folder && ALLOWED_FOLDERS.has(folder) ? folder : 'misc';

    return this.storage.uploadFile(file, targetFolder);
  }
}
