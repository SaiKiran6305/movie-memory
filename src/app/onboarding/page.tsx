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
  return <main className="shell"><header className="topbar"><a className="wordmark" href="/">◈ Movie Memory</a><form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="button-quiet">Sign out</button></form></header><section className="onboarding panel"><span className="eyebrow">YOUR FIRST SCENE</span><h1>Every movie lover<br />has that <em>one film.</em></h1><p className="muted intro">The one you could watch a hundred times. What’s yours?</p><OnboardingForm /></section></main>;
}
