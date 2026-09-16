import { prisma } from '../../src/database/prisma.js';

export async function cleanTestEntities(prefix: string = 'TEST_') {
  try {
    // Delete reviews on test assets
    await prisma.review.deleteMany({
      where: {
        asset: {
          title: { startsWith: prefix },
        },
      },
    });

    // Delete booking status histories on test bookings
    await prisma.bookingStatusHistory.deleteMany({
      where: {
        booking: {
          asset: {
            title: { startsWith: prefix },
          },
        },
      },
    });

    // Delete test bookings
    await prisma.booking.deleteMany({
      where: {
        asset: {
          title: { startsWith: prefix },
        },
      },
    });

    // Delete favorites on test assets
    await prisma.favorite.deleteMany({
      where: {
        asset: {
          title: { startsWith: prefix },
        },
      },
    });

    // Delete asset images on test assets
    await prisma.assetImage.deleteMany({
      where: {
        asset: {
          title: { startsWith: prefix },
        },
      },
    });

    // Delete test assets
    await prisma.asset.deleteMany({
      where: {
        title: { startsWith: prefix },
      },
    });

    // Delete test users (email ending with @test.rentsphere.in or starting with test-)
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@test.rentsphere.in' } },
          { email: { startsWith: 'test_' } },
        ],
      },
    });
  } catch (err) {
    // Silently ignore cleanup errors if entities not found
  }
}
