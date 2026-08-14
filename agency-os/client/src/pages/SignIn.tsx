import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { firebaseAuthErrorMessage, firebaseCurrentUser, safeReturnPath, startFirebaseGoogleLogin } from "@/lib/firebase";
import { destinationForRole } from "@/lib/roleRoutes";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

function requestedPath() {
  if (typeof window === "undefined") return "/admin";
  return safeReturnPath(new URLSearchParams(window.location.search).get("returnTo"));
}

export default function SignIn() {
  const { isAuthenticated, loading, user, hasFirebaseSession, refresh } = useAuth();
  const [returnTo] = useState(requestedPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    window.location.replace(destinationForRole(user?.role, returnTo));
  }, [isAuthenticated, loading, returnTo, user?.role]);

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const credential = await startFirebaseGoogleLogin(returnTo);
      const signedInUser = credential.user ?? firebaseCurrentUser();
      if (!signedInUser) throw new Error("Google did not return an account. Please try again.");

      // Force a current token before the profile query, then route explicitly.
      // This avoids depending on a later redirect-page lifecycle to finish login.
      await signedInUser.getIdToken(true);
      const profile = await refresh();
      if (!profile.data) throw new Error("Your Google account was accepted, but Brand Mint could not load your workspace. Please try again.");
      window.location.replace(destinationForRole(profile.data.role, returnTo));
    } catch (loginError) {
      setError(firebaseAuthErrorMessage(loginError));
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f6f0e6] px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(145,255,190,.22),transparent_24rem),linear-gradient(rgba(23,59,46,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,59,46,.045)_1px,transparent_1px)] bg-[auto,54px_54px,54px_54px]" />
      <section className="relative w-full max-w-md rounded-[28px] border border-[#d7cbbb] bg-[#fffdf8]/95 p-7 shadow-[16px_18px_0_#e5d8c5] sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#577168] hover:text-[#103c2e]"><ArrowLeft className="h-3.5 w-3.5" />Back to Brand Mint</Link>
        <div className="mt-8"><BrandMark /><h1 className="mt-8 font-display text-4xl tracking-[-0.055em] text-[#14392d]">Sign in</h1><p className="mt-3 text-sm leading-6 text-[#668078]">Continue securely with your Google account.</p></div>
        <Button onClick={signInWithGoogle} disabled={busy} className="mt-7 h-12 w-full rounded-full bg-[#103c2e] text-white hover:bg-[#0b3024]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Sign in with Google</Button>
        {error ? <div role="alert" className="mt-5 rounded-xl border border-[#f0c9be] bg-[#fff1ec] px-4 py-3 text-xs leading-5 text-[#9d4431]"><p>{error}</p>{hasFirebaseSession && !loading ? <button type="button" className="mt-2 font-bold underline underline-offset-2" onClick={() => void refresh()}>Retry workspace check</button> : null}</div> : null}
      </section>
    </main>
  );
}
