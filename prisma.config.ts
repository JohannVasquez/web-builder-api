import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  adapter: () => {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString === undefined) {
      throw new Error('DATABASE_URL is not defined');
    }
    return Promise.resolve(new PrismaPg({ connectionString }));
  },
});
