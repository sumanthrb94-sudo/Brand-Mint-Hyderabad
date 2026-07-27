import { redirect } from "next/navigation";
import { currentUser, setSession, verifyPassword } from "@/lib/session";
import { findUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/portal");
  const { e } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");
    const found = findUser(username);
    // Same failure message either way — never reveal whether a username exists.
    if (!found || !verifyPassword(password, found.passwordHash)) {
      redirect("/login?e=1");
    }
    await setSession(found.id);
    redirect(found.role === "admin" ? "/admin" : "/portal");
  }

  return (
    <div className="login">
      <div className="card">
        <div className="brand" style={{ marginBottom: 2 }}>Brand Mint</div>
        <p className="sub" style={{ marginBottom: 0 }}>Sign in to your project.</p>
        <form action={login}>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required autoFocus />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {e ? <div className="err">Wrong username or password.</div> : null}
          <button className="p" type="submit" style={{ width: "100%", marginTop: 18, padding: "10px" }}>
            Sign in
          </button>
        </form>
        <div className="demo">
          <b>Demo logins</b> — change these before you give the URL to anyone.<br />
          Admin: <code>admin</code> / <code>BrandMint@2026</code><br />
          Client: <code>greenbasket</code> / <code>GreenBasket@2026</code><br />
          Client: <code>tresor</code> / <code>Tresor@2026</code>
        </div>
      </div>
    </div>
  );
}
