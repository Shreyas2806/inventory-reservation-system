import path from 'node:path';
import type { PrismaConfig } from 'prisma';

export default {
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async seed(tx) {
      // Seed logic lives in prisma/seed.ts — run via: npm run db:seed
      void tx;
    },
  },
} satisfies PrismaConfig;
