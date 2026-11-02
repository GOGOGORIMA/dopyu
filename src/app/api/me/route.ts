import { jsonOk, unauthorized } from "@/lib/api";
import { getCurrentUser, toProfile } from "@/lib/auth/dal";

/** Profile of the logged-in user, including age and estimated volume per session. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return jsonOk({ profile: toProfile(user) });
}
