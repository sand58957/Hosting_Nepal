import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly config: ConfigService) {}

  async pick(query: string, categorySlug: string, altFallback: string): Promise<PickedImage> {
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

          if (hit?.urls?.regular) {
            return { url: hit.urls.regular, alt: hit.alt_description || altFallback };
          }
        } else {
          this.logger.warn(`Unsplash ${res.status}: ${(await res.text()).slice(0, 200)}`);
        }
      } catch (err) {
        this.logger.warn(`Unsplash lookup failed: ${(err as Error).message}`);
      }
    }

    const fallback = FALLBACK_IMAGES[categorySlug] || GENERIC_FALLBACK;

    return { url: fallback, alt: altFallback };
  }
}
