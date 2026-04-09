import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '3001', 10),
  env: process.env.APP_ENV || 'development',
  url: process.env.APP_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  resellerclub: {
    authUserId: process.env.RESELLERCLUB_AUTH_USERID || '',
    apiKey: process.env.RESELLERCLUB_API_KEY || '',
    baseUrl: process.env.RESELLERCLUB_BASE_URL || 'https://httpapi.com/api',
    sandboxUrl: process.env.RESELLERCLUB_SANDBOX_URL || 'https://test.httpapi.com/api',
    useSandbox: process.env.RESELLERCLUB_USE_SANDBOX === 'true',
  },

  payment: {
    khalti: {
      secretKey: process.env.KHALTI_SECRET_KEY || '',
      publicKey: process.env.KHALTI_PUBLIC_KEY || '',
      baseUrl: process.env.KHALTI_BASE_URL || 'https://khalti.com/api/v2',
    },
    esewa: {
      merchantCode: process.env.ESEWA_MERCHANT_CODE || '',
      baseUrl: process.env.ESEWA_BASE_URL || 'https://epay.esewa.com.np/api/epay/main/v2',
    },
  },

  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@hostingnepal.com',
  },

  sms: {
    sparrowToken: process.env.SPARROW_SMS_TOKEN || '',
    sparrowFrom: process.env.SPARROW_SMS_FROM || 'HostingNepal',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-32-byte-key-change-this!',
  },
}));
