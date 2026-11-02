import { jsonError, jsonOk, rejectCrossOrigin, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { deleteEntry } from "@/lib/services/entries";

/** Deletes one of the user's own entries (other users' entries cannot be deleted). */
export async function DELETE(request: Request, ctx: RouteContext<"/api/entries/[id]">) {
  const forbidden = rejectCrossOrigin(request);
  if (forbidden) return forbidden;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const deleted = await deleteEntry(user.id, id);
  if (!deleted) return jsonError(404, "記録が見つかりません");
  return jsonOk({ ok: true });
}
