"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <section className="onboarding panel">
        <span className="eyebrow">A BRIEF INTERMISSION</span>
        <h1>Let’s try that again.</h1>
        <p className="muted intro">
          We couldn’t load this page. Your saved movie is still yours.
        </p>
        <button className="button-primary" onClick={reset}>
          Try again
        </button>
        <p className="helper">
          <Link href="/">Return home</Link>
        </p>
      </section>
    </main>
  );
}
