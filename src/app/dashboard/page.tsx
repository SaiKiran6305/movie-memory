import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FactCard } from "@/components/fact-card";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/api/auth/signout");
  if (!user.favoriteMovie) redirect("/onboarding");
  const name = user.name?.trim() || "Movie lover";
  return (
    <main className="shell screening-room">
      <header className="topbar room-navigation">
        <Link className="wordmark" href="/"><span className="brand-symbol" aria-hidden="true">◈</span> Movie Memory</Link>
        <div className="account-bar" aria-label="Your account">
          <div className="avatar">
            {user.image ? (
              <Image width={42} height={42} unoptimized src={user.image} alt="" referrerPolicy="no-referrer" />
            ) : name.charAt(0).toUpperCase()}
          </div>
          <div className="account-copy">
            <p className="profile-name">{name}</p>
            <p className="profile-email">{user.email || "Signed in with Google"}</p>
          </div>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}>
            <button className="account-signout">Sign out <span aria-hidden="true">↗</span></button>
          </form>
        </div>
      </header>

      <section className="dashboard-heading room-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL SCREENING ROOM</span>
          <h1>Welcome back, <em>{name.split(" ")[0]}.</em></h1>
          <p className="muted">You know the film. Let’s find the details you missed.</p>
        </div>
        <div className="room-stamp" aria-hidden="true"><span>MM</span><small>ADMIT ONE<br />STAY CURIOUS</small></div>
      </section>

      <div className="section-divider"><span>IN THE SPOTLIGHT</span><span>YOUR FILM · ITS STORIES</span></div>
      <div className="dashboard-grid room-grid">
        <aside className="movie-panel panel">
          <div className="poster-art" aria-hidden="true">
            <span className="poster-index">MM / 001</span>
            <div className="poster-sun" />
            <div className="poster-horizon horizon-back" />
            <div className="poster-horizon horizon-front" />
            <span className="poster-caption">SOME STORIES<br /><i>stay with us.</i></span>
            <span className="poster-bottom">A PERSONAL CLASSIC</span>
          </div>
          <div className="movie-info">
            <span className="eyebrow"><span className="small-dot" /> YOUR FAVORITE FILM</span>
            <h2>{user.favoriteMovie}</h2>
            <p>Your pick. Always worth another look.</p>
          </div>
        </aside>
        <FactCard />
      </div>
      <section className="room-notes" aria-label="About your screening room">
        <div><span className="note-number">01</span><div><h2>A little closer to the film</h2><p>Discover a detail from the world behind your favorite movie.</p></div></div>
        <div><span className="note-number">02</span><div><h2>Take a moment. Come back.</h2><p>Your fact stays saved. Refresh after a minute for a new discovery.</p></div></div>
        <div><span className="note-number">03</span><div><h2>Made for your curiosity</h2><p>Your movie and discoveries belong to your account.</p></div></div>
      </section>
      <footer className="footer">
        <span>For the films that never leave us.</span>
        <span>MOVIE MEMORY <span aria-hidden="true">✦</span></span>
      </footer>
    </main>
  );
}
