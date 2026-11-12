export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...extra },
  });
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return json(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  console.error(
    JSON.stringify({ event: "request_failed", category: "internal_error" }),
  );
  return json(
    {
      error: {
        code: "UNAVAILABLE",
        message: "Something went wrong. Please try again shortly.",
      },
    },
    503,
  );
}
export function requireUserId(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id)
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401);
  return session.user.id;
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.AUTH_URL
    ? new URL(process.env.AUTH_URL).origin
    : new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new AppError("FORBIDDEN", "This request could not be verified.", 403);
}
