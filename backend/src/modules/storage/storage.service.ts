import { Injectable, Logger, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createHash, randomBytes } from 'crypto';
import { extname } from 'path';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>('R2_ACCOUNT_ID') &&
      this.config.get<string>('R2_ACCESS_KEY_ID') &&
      this.config.get<string>('R2_SECRET_ACCESS_KEY') &&
      this.config.get<string>('R2_BUCKET')
    );
  }

  private getClient(): S3Client {
    if (this.client) return this.client;

    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException('R2 storage is not configured');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    return this.client;
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<UploadResult> {
    const bucket = this.config.get<string>('R2_BUCKET');

    if (!bucket) throw new ServiceUnavailableException('R2_BUCKET not set');

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      key,
      url: this.getPublicUrl(key),
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
    const bucket = this.config.get<string>('R2_BUCKET');

    if (!bucket) throw new ServiceUnavailableException('R2_BUCKET not set');

    await this.getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  getPublicUrl(key: string): string {
    const base = this.config.get<string>('R2_PUBLIC_BASE_URL');

    if (!base) {
      this.logger.warn('R2_PUBLIC_BASE_URL is not set; returning r2.cloudflarestorage.com signed-style path');
      const accountId = this.config.get<string>('R2_ACCOUNT_ID');
      const bucket = this.config.get<string>('R2_BUCKET');

      return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    }

    return `${base.replace(/\/+$/, '')}/${key}`;
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
