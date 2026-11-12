"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const movie = String(new FormData(event.currentTarget).get("movie") ?? "");
    try {
      const response = await fetch("/api/me/movie", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movie }), signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (response.status === 401) { window.location.assign("/"); return; }
      if (response.status === 409 || response.ok) { router.replace("/dashboard"); router.refresh(); return; }
      setError(data.error?.message ?? "Your movie could not be saved.");
    } catch { setError("We couldn't save your movie. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <div><label className="field-label" htmlFor="movie">Your favorite movie</label><input id="movie" name="movie" maxLength={200} required autoFocus placeholder="e.g. Interstellar (2014)" aria-describedby="movie-help movie-error" disabled={busy} /><p id="movie-help" className="helper">A title is all we need. Add the year if there are multiple versions.</p></div>
    <p id="movie-error" role="alert" className="error-text">{error}</p>
    <button className="button-primary w-full" disabled={busy}>{busy ? "Saving your movie…" : "Make it memorable →"}</button>
  </form>;
}
