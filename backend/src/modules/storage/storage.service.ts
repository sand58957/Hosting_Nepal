import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { createHash, randomBytes } from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

const DEFAULT_UPLOAD_DIR = '/var/uploads';
const DEFAULT_PUBLIC_BASE = 'https://api.hostingnepals.com/uploads';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return true;
  }

  private uploadDir(): string {
    return this.config.get<string>('UPLOAD_DIR') || DEFAULT_UPLOAD_DIR;
  }

  private publicBase(): string {
    return (this.config.get<string>('UPLOAD_PUBLIC_BASE_URL') || DEFAULT_PUBLIC_BASE).replace(/\/+$/, '');
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<UploadResult> {
    const safeKey = this.sanitizeKey(key);
    const fullPath = join(this.uploadDir(), safeKey);

    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return {
      key: safeKey,
      url: this.getPublicUrl(safeKey),
      size: buffer.byteLength,
      contentType,
    };
  }

  async uploadFromUrl(sourceUrl: string, folder: string, preferredSlug?: string): Promise<UploadResult> {
    const res = await fetch(sourceUrl);

    if (!res.ok) throw new BadGatewayException(`Failed to fetch source image: ${res.status}`);

    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    if (!contentType.startsWith('image/')) {
      throw new BadGatewayException(`Source is not an image (${contentType})`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const maxBytes = 15 * 1024 * 1024;

    if (buffer.byteLength > maxBytes) {
      throw new BadGatewayException(`Source image is too large (${buffer.byteLength} bytes)`);
    }

    const ext = this.extForContentType(contentType);
    const slug = (preferredSlug || '').replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'image';
    const hash = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 10);
    const key = `${folder.replace(/^\/|\/$/g, '')}/${slug}-${hash}.${ext}`;

    return this.upload(buffer, key, contentType);
  }

  async uploadFile(file: { originalname: string; buffer: Buffer; mimetype: string; size: number }, folder: string): Promise<UploadResult> {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadGatewayException(`Only image uploads are allowed (got ${file.mimetype})`);
    }

    const maxBytes = 10 * 1024 * 1024;

    if (file.size > maxBytes) throw new BadGatewayException('File exceeds 10 MB limit');

    const ext = extname(file.originalname).replace(/^\./, '').toLowerCase() || this.extForContentType(file.mimetype);
    const safeName = file.originalname.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/gi, '-').slice(0, 60).toLowerCase() || 'file';
    const rand = randomBytes(4).toString('hex');
    const key = `${folder.replace(/^\/|\/$/g, '')}/${safeName}-${rand}.${ext}`;

    return this.upload(file.buffer, key, file.mimetype);
  }

  async delete(key: string): Promise<void> {
    const safeKey = this.sanitizeKey(key);
    const fullPath = join(this.uploadDir(), safeKey);

    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        this.logger.warn(`Failed to delete ${safeKey}: ${err.message}`);
        throw err;
      }
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicBase()}/${this.sanitizeKey(key)}`;
  }

  private sanitizeKey(key: string): string {
    const cleaned = key.replace(/^\/+/, '').replace(/\\/g, '/');

    if (cleaned.split('/').some(seg => seg === '..' || seg === '')) {
      throw new BadGatewayException('Invalid storage key');
    }

    return cleaned;
  }

  private extForContentType(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif',
      'image/svg+xml': 'svg',
    };

    return map[contentType.split(';')[0].trim()] || 'bin';
  }
}
