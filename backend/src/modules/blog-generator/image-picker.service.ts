import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StorageService } from '../storage/storage.service';

export interface PickedImage {
  url: string;
  alt: string;
}

const FALLBACK_IMAGES: Record<string, string> = {
  'wordpress-hosting': 'https://images.unsplash.com/photo-1547621869-6414d8919357?auto=format&fit=crop&w=1200&q=80',
  'vps-hosting': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
  'domains': 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80',
  'ssl-security': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
  'email-hosting': 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=1200&q=80',
  'performance': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'migration': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'nepal-business': 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=1200&q=80',
};

const GENERIC_FALLBACK = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80';

@Injectable()
export class ImagePickerService {
  private readonly logger = new Logger(ImagePickerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async pick(query: string, categorySlug: string, altFallback: string, slugForFilename?: string): Promise<PickedImage> {
    const sourceUrl = await this.sourceUrl(query, categorySlug);

    if (this.storage.isConfigured()) {
      try {
        const uploaded = await this.storage.uploadFromUrl(sourceUrl, 'blog/featured', slugForFilename || categorySlug);

        return { url: uploaded.url, alt: altFallback };
      } catch (err) {
        this.logger.warn(`R2 mirror failed, falling back to direct URL: ${(err as Error).message}`);
      }
    }

    return { url: sourceUrl, alt: altFallback };
  }

  private async sourceUrl(query: string, categorySlug: string): Promise<string> {
    const accessKey = this.config.get<string>('UNSPLASH_ACCESS_KEY');

    if (accessKey) {
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5&content_filter=high`,
          { headers: { Authorization: `Client-ID ${accessKey}` } },
        );

        if (res.ok) {
          const json: any = await res.json();
          const hit = json?.results?.[0];

          if (hit?.urls?.regular) return hit.urls.regular;
        } else {
          this.logger.warn(`Unsplash ${res.status}: ${(await res.text()).slice(0, 200)}`);
        }
      } catch (err) {
        this.logger.warn(`Unsplash lookup failed: ${(err as Error).message}`);
      }
    }

    return FALLBACK_IMAGES[categorySlug] || GENERIC_FALLBACK;
  }
}
