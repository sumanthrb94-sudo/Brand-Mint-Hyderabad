import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { getOrg } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  const org = getOrg(user.orgId);

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          Brand Mint<span>{org?.name}</span>
        </div>
        <div className="who">
          <span>{user.name}</span>
          <form action="/api/auth/logout" method="post" className="inline">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <div className="nav">
        <Link href="/portal">Your project</Link>
        <Link href="/portal/onboarding">Onboarding</Link>
      </div>
      {children}
    </div>
  );
}
