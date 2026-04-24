export const BLOG_GENERATOR_QUEUE = 'blog-generator';

export const BLOG_GENERATOR_JOBS = {
  GENERATE: 'generate-post',
} as const;

export const BLOG_GENERATOR_REPEAT_KEYS = {
  HOURLY: 'blog-gen-hourly',
  EXTRA: 'blog-gen-extra',
} as const;

export const BOT_USER_EMAIL_DEFAULT = 'content-bot@hostingnepals.com';
export const BOT_USER_NAME = 'Hosting Nepal Editorial';

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
