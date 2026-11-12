import Link from "next/link";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteMovie: true },
    });
    if (user) redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  }
  const { error } = await searchParams;
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          ◈ Movie Memory
        </Link>
        <span className="header-note">A PERSONAL FILM JOURNAL</span>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="small-dot" /> THE FILMS WE CARRY WITH US
          </span>
          <h1>
            The credits roll.
            <br />
            The feeling stays.
            <br />
            <em>Keep the story.</em>
          </h1>
          <p className="intro muted">
            A film can live in your head for years. Give your favorite a place to stay,
            and uncover the little details that make it unforgettable.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button className="button-primary google-button">
              <span className="google-g" aria-hidden="true">
                G
              </span>
              Sign in with Google <span aria-hidden="true">↗</span>
            </button>
          </form>
          {error && (
            <p role="alert" className="error-text">
              Sign-in didn’t complete. Please try again.
            </p>
          )}
          <p className="helper">
            One favorite film. An endless conversation.
          </p>
          <div className="hero-details">
            <span>01 &nbsp; Choose your film</span>
            <span>02 &nbsp; Go behind the scenes</span>
          </div>
        </div>
        <div
          className="cinema-art"
          aria-label="An illustrated cinema ticket beneath a glowing orbital scene"
          role="img"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orb" />
          <div className="art-caption">
            EVERY GREAT STORY
            <br />
            DESERVES AN ENCORE.
          </div>
          <div className="ticket">
            <div className="ticket-top">
              <span>MOVIE MEMORY</span>
              <span>ADMIT ONE</span>
            </div>
            <div className="ticket-title">
              One film.
              <br />
              <i>A thousand details.</i>
            </div>
            <div className="ticket-bottom">
              <span>A STORY WORTH REVISITING.</span>
              <div className="barcode" />
            </div>
          </div>
          <span className="art-index">MM / VOL. 001</span>
        </div>
      </section>
      <footer className="footer">
        <span>For the films that never leave us.</span>
        <span>
          Made for curious movie lovers <span aria-hidden="true">✦</span>
        </span>
      </footer>
    </main>
  );
}
