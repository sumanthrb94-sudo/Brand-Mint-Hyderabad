import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/portal");

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          Brand Mint<span>studio</span>
        </div>
        <div className="who">
          <span>{user.name}</span>
          <form action="/api/auth/logout" method="post" className="inline">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <div className="nav">
        <Link href="/admin">Dashboard</Link>
      </div>
      {children}
    </div>
  );
}
