import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/utils/logger.js';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  logger.level = 'silent';
});

afterAll(async () => {
  await prisma.$disconnect();
});
