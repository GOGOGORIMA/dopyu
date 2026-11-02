import "server-only";

/** Shared helpers for Route Handlers. Every response is private and never cached. */

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export function jsonOk<T>(data: T, init: { status?: number } = {}): Response {
  return Response.json(data, { status: init.status ?? 200, headers: NO_STORE });
}

export function jsonError(
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error: message, ...extra }, { status, headers: NO_STORE });
}

export function unauthorized(): Response {
  return jsonError(401, "ログインが必要です");
}

/** Reads a JSON body. Returns undefined if it cannot be parsed. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * CSRF defense in depth: rejects state-changing requests whose Origin differs from this site.
 * (The cookie is already SameSite=Lax; this adds a second check.)
 */
export function rejectCrossOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // An unparseable Origin is rejected.
  }
  return jsonError(403, "不正なリクエストです");
}
