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
    <main className="shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          ◈ Movie Memory
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="button-quiet">Sign out ↗</button>
        </form>
      </header>
      <section className="dashboard-heading">
        <span className="eyebrow">YOUR SCREENING ROOM</span>
        <h1>
          Welcome back, <em>{name.split(" ")[0]}.</em>
        </h1>
        <p className="muted">A place to revisit the film that stays with you.</p>
      </section>
      <div className="dashboard-grid">
        <aside className="movie-panel panel">
          <div className="mini-orbit" aria-hidden="true">
            ◈
          </div>
          <span className="eyebrow">NOW SHOWING</span>
          <h2>{user.favoriteMovie}</h2>
          <span className="movie-tag">Your chosen film</span>
          <div className="profile">
            <div className="avatar">
              {user.image ? (
                <Image
                  width={38}
                  height={38}
                  unoptimized
                  src={user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="profile-name">{name}</p>
              <p className="helper profile-email">
                {user.email || "Signed in with Google"}
              </p>
            </div>
          </div>
        </aside>
        <FactCard />
      </div>
      <footer className="footer">
        <span>Good stories are worth another look.</span>
        <span>
          MOVIE MEMORY <span aria-hidden="true">✦</span>
        </span>
      </footer>
    </main>
  );
}
