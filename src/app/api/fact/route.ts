import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createFactService } from "@/lib/facts";
import { generateFact } from "@/lib/generate-fact";
import { errorResponse, json, requireSameOrigin, requireUserId } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 20;
const getFact = createFactService(db, generateFact);
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const start = performance.now();
  try {
    const userId = requireUserId(await auth());
    requireSameOrigin(request);
    const result = await getFact(userId);
    console.info(JSON.stringify({ event: "fact_response", requestId, status: result.status, durationMs: Math.round(performance.now() - start) }));
    return json(result, result.status === "generating" ? 202 : 200, { "X-Request-Id": requestId, ...(result.status === "generating" ? { "Retry-After": "1" } : {}) });
  } catch (error) { return errorResponse(error); }
}
