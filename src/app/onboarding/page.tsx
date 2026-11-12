import Link from "next/link";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
export const dynamic = "force-dynamic";
export default async function Onboarding() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/api/auth/signout");
  if (user.favoriteMovie) redirect("/dashboard");
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
          <button className="button-quiet">Sign out</button>
        </form>
      </header>
      <section className="onboarding panel">
        <span className="eyebrow">THE OPENING SCENE</span>
        <h1>
          Start with the film
          <br />
          you <em>always return to.</em>
        </h1>
        <p className="muted intro">
          The one you quote, defend, or watch again just for a single scene. Tell us its name.
        </p>
        <OnboardingForm />
      </section>
    </main>
  );
}
