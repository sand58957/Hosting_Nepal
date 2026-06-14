import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { createHash, randomBytes } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

  // R2 (Cloudflare object storage) — used when all R2_* env vars are present.
  // Falls back to local /var/uploads disk otherwise, so this is safe to ship
  // before the env is set.
  private readonly s3: S3Client | null = null;
  private readonly r2Bucket: string = '';
  private readonly r2PublicBase: string = '';

  constructor(private readonly config: ConfigService) {
    // Accept either a full endpoint (R2_ACCOUNT_ENDPOINT) or just the account id
    // (R2_ACCOUNT_ID) and build the S3 endpoint from it.
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const endpoint =
      this.config.get<string>('R2_ACCOUNT_ENDPOINT') ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET') || '';
    const publicBase = (this.config.get<string>('R2_PUBLIC_BASE_URL') || '').replace(/\/+$/, '');

    if (endpoint && accessKeyId && secretAccessKey && bucket && publicBase) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        // R2 rejects the SDK's default flexible-checksum (CRC32) headers; only
        // send them when an operation strictly requires it.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      } as any);
      this.r2Bucket = bucket;
      this.r2PublicBase = publicBase;
      this.logger.log(`R2 storage enabled (bucket=${bucket}, public=${publicBase})`);
    } else {
      this.logger.log('R2 not configured — using local /var/uploads disk storage');
    }
  }

  private r2Enabled(): boolean {
    return this.s3 !== null;
  }

  isConfigured(): boolean {
    return true;
  }

  private uploadDir(): string {
    return this.config.get<string>('UPLOAD_DIR') || DEFAULT_UPLOAD_DIR;
  }

  private publicBase(): string {
    if (this.r2Enabled()) return this.r2PublicBase;

    return (this.config.get<string>('UPLOAD_PUBLIC_BASE_URL') || DEFAULT_PUBLIC_BASE).replace(/\/+$/, '');
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<UploadResult> {
    const safeKey = this.sanitizeKey(key);

    if (this.r2Enabled()) {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.r2Bucket,
          Key: safeKey,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } else {
      const fullPath = join(this.uploadDir(), safeKey);

      await fs.mkdir(dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);
    }

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

    if (this.r2Enabled()) {
      try {
        await this.s3!.send(new DeleteObjectCommand({ Bucket: this.r2Bucket, Key: safeKey }));
      } catch (err: any) {
        this.logger.warn(`Failed to delete ${safeKey} from R2: ${err.message}`);
      }

      return;
    }

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
