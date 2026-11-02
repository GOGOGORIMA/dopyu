import "server-only";
import { prisma } from "@/lib/prisma";

export type MyTag = { name: string; count: number };

/** The user's past tags, most used first (for the chip suggestions). */
export async function listMyTags(userId: string): Promise<MyTag[]> {
  const tags = await prisma.tag.findMany({
    where: { userId },
    select: { name: true, createdAt: true, _count: { select: { entries: true } } },
  });
  return tags
    .sort(
      (a, b) =>
        b._count.entries - a._count.entries || b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .map((tag) => ({ name: tag.name, count: tag._count.entries }));
}
