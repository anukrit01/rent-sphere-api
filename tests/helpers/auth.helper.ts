import { UserRole } from '@prisma/client';
import { prisma } from '../../src/database/prisma.js';
import { generateAccessToken } from '../../src/utils/token.js';

export interface TestUser {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  headers: { Authorization: string };
}

let cachedAdmin: TestUser | null = null;
let cachedRenter: TestUser | null = null;
let cachedLeaser: TestUser | null = null;

export async function getAdminUser(): Promise<TestUser> {
  if (cachedAdmin) return cachedAdmin;
  const user = await prisma.user.findFirstOrThrow({ where: { role: UserRole.ADMIN } });
  const token = generateAccessToken({ sub: user.id, email: user.email, role: user.role });
  cachedAdmin = {
    id: user.id,
    email: user.email,
    role: user.role,
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
  return cachedAdmin;
}

export async function getRenterUser(): Promise<TestUser> {
  if (cachedRenter) return cachedRenter;
  const user = await prisma.user.findFirstOrThrow({ where: { role: UserRole.RENTER } });
  const token = generateAccessToken({ sub: user.id, email: user.email, role: user.role });
  cachedRenter = {
    id: user.id,
    email: user.email,
    role: user.role,
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
  return cachedRenter;
}

export async function getLeaserUser(): Promise<TestUser> {
  if (cachedLeaser) return cachedLeaser;
  const user = await prisma.user.findFirstOrThrow({ where: { role: UserRole.LEASER } });
  const token = generateAccessToken({ sub: user.id, email: user.email, role: user.role });
  cachedLeaser = {
    id: user.id,
    email: user.email,
    role: user.role,
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
  return cachedLeaser;
}

export function createTokenForUser(userId: string, email: string, role: UserRole): string {
  return generateAccessToken({ sub: userId, email, role });
}
