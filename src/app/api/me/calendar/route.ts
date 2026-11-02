import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { APP_TIME_ZONE } from "@/lib/config";
import { getMyCalendar } from "@/lib/services/stats";
import { getZonedParts, resolveTimeZone } from "@/lib/time";
import { parseYearMonth } from "@/lib/validation";

/** Monthly calendar of entry counts (?tz=Asia/Tokyo&month=2026-11). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const params = new URL(request.url).searchParams;
  const timeZone = resolveTimeZone(params.get("tz"), APP_TIME_ZONE);
  const today = getZonedParts(new Date(), timeZone);
  const monthParam = params.get("month");
  const target = monthParam ? parseYearMonth(monthParam) : today;
  if (!target) return jsonError(400, "month は YYYY-MM 形式で指定してください");

  const calendar = await getMyCalendar(user.id, timeZone, target.year, target.month);
  return jsonOk({ ...calendar, today: { year: today.year, month: today.month, day: today.day } });
}
