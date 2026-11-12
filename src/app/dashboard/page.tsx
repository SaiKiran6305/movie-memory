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
    <main className="shell dashboard-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          ◈ Movie Memory
        </Link>
        <details className="account-menu">
          <summary aria-label={`Account: ${name}`}>
            <span className="avatar">
              {user.image ? <Image width={38} height={38} unoptimized src={user.image} alt="" referrerPolicy="no-referrer" /> : name.charAt(0).toUpperCase()}
            </span>
            <span className="account-name">{name}</span>
            <span className="account-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="account-popover">
            <p className="profile-name">{name}</p>
            <p className="helper profile-email">{user.email || "Signed in with Google"}</p>
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}>
              <button className="button-quiet">Sign out ↗</button>
            </form>
          </div>
        </details>
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
          <div className="movie-card-top"><span className="eyebrow">YOUR FAVORITE FILM</span><span aria-hidden="true">✦</span></div>
          <div className="film-illustration" aria-hidden="true">
            <svg viewBox="0 0 320 200" fill="none">
              <ellipse cx="160" cy="168" rx="105" ry="12" fill="#062e32" opacity=".35" />
              <path d="M188 101 290 56v117l-102-38Z" fill="#d6edbd" opacity=".12" />
              <rect x="82" y="93" width="123" height="67" rx="12" fill="#d6edbd" />
              <path d="m205 108 28-15v66l-28-15Z" fill="#b7d39d" />
              <circle cx="109" cy="72" r="36" fill="#f5eed9" />
              <circle cx="175" cy="65" r="42" fill="#b7d39d" />
              <g fill="#1d6264">
                <circle cx="109" cy="72" r="7" /><circle cx="109" cy="51" r="8" /><circle cx="89" cy="78" r="8" /><circle cx="122" cy="89" r="8" />
                <circle cx="175" cy="65" r="8" /><circle cx="175" cy="40" r="10" /><circle cx="151" cy="72" r="10" /><circle cx="190" cy="84" r="10" />
                <rect x="98" y="111" width="66" height="6" rx="3" /><rect x="98" y="125" width="43" height="6" rx="3" />
              </g>
              <path d="m127 160-10 16m53-16 10 16" stroke="#b7d39d" strokeWidth="8" strokeLinecap="round" />
              <path d="M50 45v14m-7-7h14M263 27v12m-6-6h12" stroke="#d6edbd" strokeWidth="2" />
              <circle cx="48" cy="127" r="3" fill="#d6edbd" />
            </svg>
          </div>
          <span className="eyebrow">NOW SHOWING</span>
          <h2>{user.favoriteMovie}</h2>
          <span className="movie-tag">A story worth returning to</span>
          <div className="movie-card-footer"><span>PERSONAL COLLECTION</span><span aria-hidden="true">01 / 01</span></div>
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
