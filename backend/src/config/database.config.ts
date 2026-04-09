import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://hosting_nepal:password@localhost:5432/hosting_nepal',
}));
