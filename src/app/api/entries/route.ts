import { jsonError, jsonOk, readJsonBody, rejectCrossOrigin, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { createEntry, listRecentEntries } from "@/lib/services/entries";
import { createEntrySchema, MIN_RANKABLE_SECONDS, toFieldErrors } from "@/lib/validation";

/** The user's own recent entries (?limit=20). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const entries = await listRecentEntries(user.id, Number.isFinite(limit) ? limit : 20);
  return jsonOk({ entries });
}

/** Saves an entry (completion time, measured time, tags). */
export async function POST(request: Request) {
  const forbidden = rejectCrossOrigin(request);
  if (forbidden) return forbidden;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = createEntrySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error);
    return jsonError(400, Object.values(fieldErrors)[0] ?? "入力内容を確認してください", {
      fieldErrors,
    });
  }

  const entry = await createEntry(user, parsed.data);
  return jsonOk(
    {
      entry,
      warning: entry.isRankable
        ? null
        : `計測時間が${MIN_RANKABLE_SECONDS}秒未満のため、この記録はランキング集計の対象外です`,
    },
    { status: 201 },
  );
}
