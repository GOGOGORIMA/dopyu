import { jsonOk, rejectCrossOrigin } from "@/lib/api";
import { deleteSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const forbidden = rejectCrossOrigin(request);
  if (forbidden) return forbidden;

  await deleteSession();
  return jsonOk({ ok: true });
}
