import { auth } from "@/auth";
import { db } from "@/lib/db";
import { movieSchema } from "@/lib/movie";
import {
  AppError,
  errorResponse,
  json,
  requireSameOrigin,
  requireUserId,
} from "@/lib/http";
export const runtime = "nodejs";
export async function PUT(request: Request) {
  try {
    const userId = requireUserId(await auth());
    requireSameOrigin(request);
    const raw = await request.text();
    if (raw.length > 2048)
      throw new AppError("INVALID_INPUT", "Movie title is too long.", 400);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError("INVALID_INPUT", "Send a valid movie title.", 400);
    }
    const parsed = movieSchema.safeParse(body);
    if (!parsed.success)
      throw new AppError("INVALID_INPUT", parsed.error.issues[0].message, 400);
    // Onboarding is a one-time atomic update. A second tab cannot overwrite it.
    const result = await db.user.updateMany({
      where: { id: userId, favoriteMovie: null },
      data: { favoriteMovie: parsed.data.movie },
    });
    if (!result.count)
      throw new AppError(
        "ALREADY_ONBOARDED",
        "Your favorite movie is already saved. Open your dashboard.",
        409,
      );
    return json({ movie: parsed.data.movie });
  } catch (error) {
    return errorResponse(error);
  }
}
