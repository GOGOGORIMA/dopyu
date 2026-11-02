import "server-only";
import { APP_TIME_ZONE } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import type { CreateEntryInput } from "@/lib/validation";
import { MIN_RANKABLE_SECONDS } from "@/lib/validation";
import { estimateVolumeMl } from "@/lib/volume";

/** An entry shown only to its owner. Never pass this to ranking code. */
export type MyEntry = {
  id: string;
  completedAt: string;
  durationSeconds: number;
  volumeMl: number;
  isRankable: boolean;
  tags: string[];
};

const myEntrySelect = {
  id: true,
  completedAt: true,
  durationSeconds: true,
  volumeMl: true,
  isRankable: true,
  tags: { select: { tag: { select: { name: true } } } },
} as const;

function toMyEntry(entry: {
  id: string;
  completedAt: Date;
  durationSeconds: number;
  volumeMl: number;
  isRankable: boolean;
  tags: { tag: { name: string } }[];
}): MyEntry {
  return {
    id: entry.id,
    completedAt: entry.completedAt.toISOString(),
    durationSeconds: entry.durationSeconds,
    volumeMl: entry.volumeMl,
    isRankable: entry.isRankable,
    tags: entry.tags.map((t) => t.tag.name),
  };
}

export async function createEntry(
  user: { id: string; birthDate: Date },
  input: CreateEntryInput,
): Promise<MyEntry> {
  // Volume comes from the age at completion time, stored as a snapshot.
  const volumeMl = estimateVolumeMl(user.birthDate, input.completedAt, APP_TIME_ZONE);
  // Anti-cheat: entries under 10 seconds stay excluded from rankings.
  const isRankable = input.durationSeconds >= MIN_RANKABLE_SECONDS;

  const entry = await prisma.$transaction(async (tx) => {
    const tagIds: string[] = [];
    for (const name of input.tags) {
      const tag = await tx.tag.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: {},
        create: { userId: user.id, name },
        select: { id: true },
      });
      tagIds.push(tag.id);
    }
    return tx.entry.create({
      data: {
        userId: user.id,
        completedAt: input.completedAt,
        durationSeconds: input.durationSeconds,
        volumeMl,
        isRankable,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: myEntrySelect,
    });
  });

  return toMyEntry(entry);
}

export async function listRecentEntries(userId: string, limit = 20): Promise<MyEntry[]> {
  const entries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: myEntrySelect,
  });
  return entries.map(toMyEntry);
}

/** Deletes one of the user's own entries. Returns false if not found or owned by someone else. */
export async function deleteEntry(userId: string, entryId: string): Promise<boolean> {
  const result = await prisma.entry.deleteMany({ where: { id: entryId, userId } });
  return result.count > 0;
}
