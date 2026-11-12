"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { factResponseSchema, type FactResponse } from "@/lib/fact-contract";
type Ready = Exclude<FactResponse, { status: "generating" }>;
export function FactCard() {
  const router = useRouter();
  const [fact, setFact] = useState<Ready | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const timeout = setTimeout(() => current.abort(), 15000);
    setLoading(true);
    setError("");
    try {
      while (!current.signal.aborted) {
        const response = await fetch("/api/fact", {
          method: "POST",
          signal: current.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        if (response.status === 409) {
          router.replace("/onboarding");
          return;
        }
        const data: unknown = await response.json();
        if (!response.ok) {
          const body = data as { error?: { message?: string } };
          throw new Error(
            body.error?.message ?? "We couldn't load a fact. Please try again.",
          );
        }
        const parsed = factResponseSchema.parse(data);
        if (parsed.status !== "generating") {
          setFact(parsed);
          setNow(Date.now());
          return;
        }
        await new Promise<void>((resolve, reject) => {
          const stop = () => {
            clearTimeout(timer);
            reject(new Error("Request stopped"));
          };
          const timer = setTimeout(
            () => {
              current.signal.removeEventListener("abort", stop);
              resolve();
            },
            Math.min(parsed.retryAfterMs, 2000),
          );
          current.signal.addEventListener("abort", stop, { once: true });
          if (current.signal.aborted) stop();
        });
      }
    } catch (reason) {
      if (controller.current !== current) return;
      setError(
        current.signal.aborted
          ? "This is taking longer than expected. Please try again in a moment."
          : reason instanceof Error
            ? reason.message
            : "Unable to load your fact.",
      );
    } finally {
      clearTimeout(timeout);
      if (controller.current === current) setLoading(false);
    }
  }, [router]);
  useEffect(() => {
    const start = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(start);
      const current = controller.current;
      controller.current = null;
      current?.abort();
    };
  }, [load]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const age = fact
    ? Math.max(0, Math.floor((now - Date.parse(fact.createdAt)) / 1000))
    : 0;
  const remaining = Math.max(0, 60 - age);
  return (
    <section
      className="fact-card panel"
      aria-labelledby="fact-title"
      aria-busy={loading}
    >
      <div className="card-top">
        <span className="eyebrow">BEHIND THE SCENES</span>
        <span className="sparkle" aria-hidden="true">
          ✦
        </span>
      </div>
      <h2 id="fact-title">A little movie magic.</h2>
      <div className="fact-content" aria-live="polite">
        {!fact && loading ? (
          <div className="loading-copy">
            <div className="skeleton" />
            <div className="skeleton short" />
            <p className="muted">Finding a story worth sharing…</p>
          </div>
        ) : fact ? (
          <blockquote>{fact.fact}</blockquote>
        ) : (
          <p className="muted">Your next discovery is a click away.</p>
        )}
      </div>
      {fact?.status === "stale-fallback" && (
        <p className="notice">
          Showing an older fact while a new one is unavailable.
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="fact-bottom">
        <div>
          {fact && (
            <>
              <span className="status-badge">
                <span className="small-dot" />
                {fact.status === "stale-fallback"
                  ? "Saved discovery"
                  : fact.status === "fresh"
                    ? "Just discovered"
                    : "From your collection"}
              </span>
              <p className="helper">
                {age < 60
                  ? `${age}s ago`
                  : age < 3600
                    ? `${Math.floor(age / 60)}m ago`
                    : "Previously saved"}{" "}
                ·{" "}
                {remaining
                  ? `New discovery available in ${remaining}s`
                  : "Ready for another discovery"}
              </p>
            </>
          )}
        </div>
        <button
          className="button-secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Discovering…" : error ? "Try again ↻" : "Refresh fact ↻"}
        </button>
      </div>
      <p className="disclaimer">
        AI-generated movie trivia can occasionally be inaccurate.
      </p>
    </section>
  );
}
