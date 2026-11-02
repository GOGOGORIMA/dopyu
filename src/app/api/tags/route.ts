import { jsonOk, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { listMyTags } from "@/lib/services/tags";

/** The user's own past tags (for the chip suggestions). Other users' tags are never returned. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return jsonOk({ tags: await listMyTags(user.id) });
}
