import Link from "next/link";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { favoriteMovie: true } });
    if (user) redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  }
  const { error } = await searchParams;
  return <main className="shell">
    <header className="topbar"><Link className="wordmark" href="/">◈ Movie Memory</Link><span className="header-note">FOR THE LOVE OF FILM</span></header>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><span className="small-dot" /> A NEW WAY TO REVISIT YOUR FAVORITE</span>
        <h1>Some movies<br />stay with you.<br /><em>Keep the magic.</em></h1>
        <p className="intro muted">Your favorite film has more stories to tell. Save the one you love and discover a little something you didn’t know.</p>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
          <button className="button-primary google-button"><span className="google-g" aria-hidden="true">G</span>Sign in with Google <span aria-hidden="true">↗</span></button>
        </form>
        {error && <p role="alert" className="error-text">Sign-in didn’t complete. Please try again.</p>}
        <p className="helper">Your movie. Your account. A moment of discovery.</p>
        <div className="hero-details"><span>01 &nbsp; Pick your film</span><span>02 &nbsp; Discover its story</span></div>
      </div>
      <div className="cinema-art" aria-label="An illustrated cinema ticket beneath a glowing orbital scene" role="img">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orb" />
        <div className="art-caption">EVERY GREAT FILM<br />LEAVES AN IMPRESSION.</div>
        <div className="ticket"><div className="ticket-top"><span>MOVIE MEMORY</span><span>ADMIT ONE</span></div><div className="ticket-title">Your next<br /><i>“I never knew that.”</i></div><div className="ticket-bottom"><span>ONE FAVORITE. MORE TO DISCOVER.</span><div className="barcode" /></div></div>
        <span className="art-index">MM / VOL. 001</span>
      </div>
    </section>
    <footer className="footer"><span>A little more movie magic.</span><span>Made for curious movie lovers <span aria-hidden="true">✦</span></span></footer>
  </main>;
}
