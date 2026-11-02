import { jsonOk, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { APP_TIME_ZONE } from "@/lib/config";
import { getMyStats } from "@/lib/services/stats";
import { resolveTimeZone } from "@/lib/time";

/** My Page analytics (?tz= is the browser's IANA time zone). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const timeZone = resolveTimeZone(new URL(request.url).searchParams.get("tz"), APP_TIME_ZONE);
  return jsonOk(await getMyStats(user.id, timeZone));
}
