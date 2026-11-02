import { jsonError, jsonOk, readJsonBody, rejectCrossOrigin } from "@/lib/api";
import { verifyPasswordOrDummy } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { loginSchema, toFieldErrors } from "@/lib/validation";

export async function POST(request: Request) {
  const forbidden = rejectCrossOrigin(request);
  if (forbidden) return forbidden;

  const parsed = loginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonError(400, "入力内容を確認してください", {
      fieldErrors: toFieldErrors(parsed.error),
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, username: true, passwordHash: true },
  });
  const valid = await verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);
  if (!user || !valid) {
    // Do not reveal whether the account exists.
    return jsonError(401, "メールアドレスまたはパスワードが正しくありません");
  }

  await createSession(request, user.id);
  return jsonOk({ user: { username: user.username } });
}
