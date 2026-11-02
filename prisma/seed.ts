/**
 * DOPYU seed script
 *
 * Creates dummy users across several countries and a year of sample entries.
 * Uses a seeded PRNG, so the same distribution comes out on every run
 * (dates are generated relative to the time you run it).
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createDriverAdapter } from "../src/lib/db-adapter";
import {
  DEFAULT_TIME_ZONE,
  getDaysInMonth,
  getZonedParts,
  resolveTimeZone,
  zonedTimeToUtc,
} from "../src/lib/time";
import { estimateVolumeMl } from "../src/lib/volume";

const APP_TIME_ZONE = resolveTimeZone(process.env.APP_TIME_ZONE, DEFAULT_TIME_ZONE);
const SEED_PASSWORD = "password123";

const prisma = new PrismaClient({ adapter: createDriverAdapter() });

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) and distributions
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261102);
const randInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function gaussian(): number {
  const u = 1 - random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function poisson(lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= random();
  } while (p > limit);
  return k - 1;
}

function weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------
type SeedUser = {
  email: string;
  username: string;
  countryCode: string;
  timeZone: string;
  birthDate: string;
  /** Average sessions per week (0 means a member with no entries) */
  perWeek: number;
  /** Hour this user records most often (local time) */
  peakHour: number;
  favoriteTags: string[];
};

const JA_TAGS = ["動画", "画像", "漫画", "同人誌", "アニメ", "ASMR", "グラビア", "妄想", "官能小説", "ゲーム", "VR", "写真集", "コスプレ", "ボイス作品"];
const EN_TAGS = ["video", "photos", "imagination", "audio", "comics", "VR", "anime", "novel"];

const USERS: SeedUser[] = [
  { email: "demo@dopyu.app", username: "dopyu_taro", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1994-06-15", perWeek: 4.5, peakHour: 23, favoriteTags: ["動画", "妄想", "ASMR", "漫画", "グラビア", "VR"] },
  { email: "sakura@example.com", username: "sakura_77", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "2001-03-03", perWeek: 6, peakHour: 1, favoriteTags: ["アニメ", "同人誌", "漫画"] },
  { email: "kenji@example.com", username: "kenji_45", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1981-09-20", perWeek: 3, peakHour: 6, favoriteTags: ["グラビア", "写真集", "動画"] },
  { email: "yuki@example.com", username: "yuki_n", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1990-01-10", perWeek: 5, peakHour: 22, favoriteTags: ["官能小説", "妄想", "ボイス作品"] },
  { email: "hiroshi@example.com", username: "hiroshi_s", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1967-12-01", perWeek: 2, peakHour: 5, favoriteTags: ["写真集", "動画"] },
  { email: "ren@example.com", username: "ren_19", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "2007-02-14", perWeek: 8, peakHour: 0, favoriteTags: ["ゲーム", "アニメ", "VR", "コスプレ"] },
  { email: "nanashi@example.com", username: "nanashi", countryCode: "JP", timeZone: "Asia/Tokyo", birthDate: "1985-05-05", perWeek: 0, peakHour: 22, favoriteTags: [] },
  { email: "mike@example.com", username: "eagle_mike", countryCode: "US", timeZone: "America/New_York", birthDate: "1993-07-04", perWeek: 5, peakHour: 23, favoriteTags: ["video", "photos", "imagination"] },
  { email: "jsmith@example.com", username: "j_smith", countryCode: "US", timeZone: "America/Chicago", birthDate: "1962-03-30", perWeek: 2, peakHour: 21, favoriteTags: ["photos", "novel"] },
  { email: "luna@example.com", username: "luna_ray", countryCode: "US", timeZone: "America/Los_Angeles", birthDate: "1999-10-31", perWeek: 4, peakHour: 0, favoriteTags: ["audio", "imagination", "comics"] },
  { email: "minjun@example.com", username: "minjun_kr", countryCode: "KR", timeZone: "Asia/Seoul", birthDate: "1997-08-15", perWeek: 6, peakHour: 1, favoriteTags: ["video", "anime", "VR"] },
  { email: "seoul@example.com", username: "seoul_king", countryCode: "KR", timeZone: "Asia/Seoul", birthDate: "1984-11-11", perWeek: 3.5, peakHour: 23, favoriteTags: ["video", "photos"] },
  { email: "longwei@example.com", username: "longwei", countryCode: "CN", timeZone: "Asia/Shanghai", birthDate: "1991-02-02", perWeek: 4, peakHour: 22, favoriteTags: ["video", "novel", "imagination"] },
  { email: "carioca@example.com", username: "carioca_br", countryCode: "BR", timeZone: "America/Sao_Paulo", birthDate: "2000-12-25", perWeek: 7, peakHour: 2, favoriteTags: ["video", "photos", "audio"] },
  { email: "pedro@example.com", username: "pedro_samba", countryCode: "BR", timeZone: "America/Sao_Paulo", birthDate: "1978-04-21", perWeek: 3, peakHour: 13, favoriteTags: ["imagination", "video"] },
  { email: "hans@example.com", username: "hans_berlin", countryCode: "DE", timeZone: "Europe/Berlin", birthDate: "1974-10-03", perWeek: 2.5, peakHour: 7, favoriteTags: ["photos", "novel"] },
  { email: "pierre@example.com", username: "pierre_fr", countryCode: "FR", timeZone: "Europe/Paris", birthDate: "1987-07-14", perWeek: 3, peakHour: 23, favoriteTags: ["novel", "imagination", "audio"] },
  { email: "london@example.com", username: "london_lad", countryCode: "GB", timeZone: "Europe/London", birthDate: "2003-06-02", perWeek: 5, peakHour: 0, favoriteTags: ["video", "comics", "anime"] },
  { email: "raj@example.com", username: "raj_mumbai", countryCode: "IN", timeZone: "Asia/Kolkata", birthDate: "1996-01-26", perWeek: 4, peakHour: 22, favoriteTags: ["video", "imagination"] },
  { email: "bangkok@example.com", username: "bangkok_boy", countryCode: "TH", timeZone: "Asia/Bangkok", birthDate: "1998-04-13", perWeek: 4.5, peakHour: 21, favoriteTags: ["video", "anime", "photos"] },
  { email: "dan@example.com", username: "aussie_dan", countryCode: "AU", timeZone: "Australia/Sydney", birthDate: "1982-01-26", perWeek: 3, peakHour: 6, favoriteTags: ["photos", "video", "audio"] },
];

/** Base weights for the hour-of-day distribution (more at night). */
const BASE_HOUR_WEIGHTS = [5, 3, 1.5, 0.7, 0.4, 0.5, 1.2, 1.8, 1, 0.8, 0.8, 1, 1.4, 1, 0.8, 0.9, 1.1, 1.4, 1.8, 2.4, 3.2, 4.6, 6, 6.5];

function hourWeightsFor(peakHour: number): number[] {
  return BASE_HOUR_WEIGHTS.map((base, hour) => {
    const raw = Math.abs(hour - peakHour);
    const distance = Math.min(raw, 24 - raw);
    return base + 7 * Math.exp(-(distance * distance) / 3);
  });
}

/** Duration in seconds: log-normal with a median around 9 minutes, plus about 2.5% very short entries (under 10 s). */
function sampleDurationSeconds(): number {
  if (random() < 0.025) return randInt(3, 9);
  const seconds = Math.exp(Math.log(540) + 0.55 * gaussian());
  return Math.round(Math.min(Math.max(seconds, 60), 3600));
}

function sampleTags(favorites: string[], pool: string[]): string[] {
  if (favorites.length === 0) return [];
  const howMany = weightedPick([0, 1, 2, 3], [1, 4, 3, 1.2]);
  const chosen = new Set<string>();
  for (let i = 0; i < howMany; i += 1) {
    // Mostly favorites (earlier ones more often), occasionally a random pick from the pool
    if (random() < 0.85) {
      chosen.add(weightedPick(favorites, favorites.map((_, idx) => 1 / (idx + 1))));
    } else {
      chosen.add(pool[randInt(0, pool.length - 1)]);
    }
  }
  return [...chosen];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const now = new Date();
  const currentYear = getZonedParts(now, APP_TIME_ZONE).year;

  console.log(`Seeding DOPYU (ranking year ${currentYear}, ranking time zone ${APP_TIME_ZONE})...`);

  await prisma.entryTag.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  // Every account shares the same password, so hash it only once.
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  let totalEntries = 0;
  let previousYearEntries = 0;
  let shortEntries = 0;

  for (const seedUser of USERS) {
    const birthDate = new Date(`${seedUser.birthDate}T00:00:00.000Z`);
    const user = await prisma.user.create({
      data: {
        email: seedUser.email,
        username: seedUser.username,
        passwordHash,
        birthDate,
        countryCode: seedUser.countryCode,
      },
    });

    if (seedUser.perWeek <= 0) continue;

    const pool = seedUser.countryCode === "JP" ? JA_TAGS : EN_TAGS;
    const hourWeights = hourWeightsFor(seedUser.peakHour);
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const lambda = seedUser.perWeek / 7;

    const entries: {
      id: string;
      userId: string;
      completedAt: Date;
      durationSeconds: number;
      volumeMl: number;
      isRankable: boolean;
    }[] = [];
    const entryTagNames = new Map<string, string[]>();

    // Generate day by day in the user's local time, from December of last year until now
    const local = getZonedParts(now, seedUser.timeZone);
    for (let year = currentYear - 1; year <= local.year; year += 1) {
      const firstMonth = year === currentYear - 1 ? 12 : 1;
      const lastMonth = year === local.year ? local.month : 12;
      for (let month = firstMonth; month <= lastMonth; month += 1) {
        const lastDay =
          year === local.year && month === local.month ? local.day : getDaysInMonth(year, month);
        for (let day = 1; day <= lastDay; day += 1) {
          const sessions = poisson(lambda);
          for (let i = 0; i < sessions; i += 1) {
            const hour = weightedPick(hours, hourWeights);
            const completedAt = zonedTimeToUtc(
              seedUser.timeZone,
              year,
              month,
              day,
              hour,
              randInt(0, 59),
              randInt(0, 59),
            );
            if (completedAt.getTime() > now.getTime()) continue;

            const durationSeconds = sampleDurationSeconds();
            const id = randomUUID();
            entries.push({
              id,
              userId: user.id,
              completedAt,
              durationSeconds,
              volumeMl: estimateVolumeMl(birthDate, completedAt, APP_TIME_ZONE),
              isRankable: durationSeconds >= 10,
            });
            entryTagNames.set(id, sampleTags(seedUser.favoriteTags, pool));
          }
        }
      }
    }

    // Make sure the demo account has entries in the current month (so the calendar shows stamps)
    if (seedUser.email === "demo@dopyu.app") {
      for (const hoursAgo of [26, 50]) {
        const completedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        const id = randomUUID();
        entries.push({
          id,
          userId: user.id,
          completedAt,
          durationSeconds: 600 + hoursAgo * 7,
          volumeMl: estimateVolumeMl(birthDate, completedAt, APP_TIME_ZONE),
          isRankable: true,
        });
        entryTagNames.set(id, ["動画", "妄想"]);
      }
    }

    // Tags (unique per user)
    const tagNames = new Set([...entryTagNames.values()].flat());
    const tagIdByName = new Map<string, string>();
    for (const name of tagNames) tagIdByName.set(name, randomUUID());
    await prisma.tag.createMany({
      data: [...tagIdByName].map(([name, id]) => ({ id, name, userId: user.id })),
    });

    await prisma.entry.createMany({ data: entries });
    await prisma.entryTag.createMany({
      data: entries.flatMap((entry) =>
        (entryTagNames.get(entry.id) ?? []).map((name) => ({
          entryId: entry.id,
          tagId: tagIdByName.get(name)!,
        })),
      ),
    });

    totalEntries += entries.length;
    previousYearEntries += entries.filter(
      (e) => getZonedParts(e.completedAt, APP_TIME_ZONE).year < currentYear,
    ).length;
    shortEntries += entries.filter((e) => !e.isRankable).length;
  }

  console.log(`  users:   ${USERS.length}`);
  console.log(`  entries: ${totalEntries} (previous year: ${previousYearEntries}, excluded from rankings for being under 10 s: ${shortEntries})`);
  console.log("");
  console.log("Demo account:");
  console.log("  email:    demo@dopyu.app");
  console.log(`  password: ${SEED_PASSWORD}`);
  console.log(`(Every other dummy user also has the password "${SEED_PASSWORD}".)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
