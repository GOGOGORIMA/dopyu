import { Prisma } from "@/generated/prisma/client";
import { jsonError, jsonOk, readJsonBody, rejectCrossOrigin } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { registerSchema, toFieldErrors } from "@/lib/validation";

export async function POST(request: Request) {
  const forbidden = rejectCrossOrigin(request);
  if (forbidden) return forbidden;

  const parsed = registerSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonError(400, "入力内容を確認してください", {
      fieldErrors: toFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;

  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: input.username }, select: { id: true } }),
  ]);
  if (emailTaken || usernameTaken) {
    return jsonError(409, "既に使われている項目があります", {
      fieldErrors: {
        ...(emailTaken ? { email: "このメールアドレスは既に登録されています" } : {}),
        ...(usernameTaken ? { username: "このユーザーネームは既に使われています" } : {}),
      },
    });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        username: input.username,
        birthDate: input.birthDate,
        countryCode: input.countryCode,
      },
      select: { id: true, username: true, countryCode: true },
    });
    await createSession(request, user.id);
    return jsonOk({ user: { username: user.username, countryCode: user.countryCode } }, { status: 201 });
  } catch (error) {
    // A concurrent request registered the same email or username first
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "メールアドレスまたはユーザーネームが既に使われています");
    }
    throw error;
  }
}
