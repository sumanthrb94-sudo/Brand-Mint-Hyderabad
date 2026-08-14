import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import {
  firebaseAuthErrorMessage,
  safeReturnPath,
  startFirebaseGoogleLogin,
} from "@/lib/firebase";
import { accessCopy, destinationForRole } from "@/lib/roleRoutes";
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

  useEffect(() => {
    if (loading || !hasFirebaseSession || isAuthenticated) return;
    setError("Google sign-in completed, but Agency OS could not confirm server access. Retry the account check once; if it persists, the server Firebase configuration needs attention.");
  }, [hasFirebaseSession, isAuthenticated, loading]);

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await startFirebaseGoogleLogin(returnTo);
    } catch (loginError) {
      setBusy(false);
      setError(firebaseAuthErrorMessage(loginError));
    }
  };

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f6f0e6] px-5 py-10"><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(145,255,190,.22),transparent_24rem),linear-gradient(rgba(23,59,46,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,59,46,.045)_1px,transparent_1px)] bg-[auto,54px_54px,54px_54px]" /><section className="relative w-full max-w-md rounded-[28px] border border-[#d7cbbb] bg-[#fffdf8]/95 p-7 shadow-[16px_18px_0_#e5d8c5] sm:p-9"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#577168] hover:text-[#103c2e]"><ArrowLeft className="h-3.5 w-3.5" />Back to Brand Mint</Link><div className="mt-8"><BrandMark /><p className="eyebrow mt-8">Client and team access</p><h1 className="mt-3 font-display text-4xl tracking-[-0.055em] text-[#14392d]">{accessCopy.signedOutTitle}</h1><p className="mt-3 text-sm leading-6 text-[#668078]">{accessCopy.signedOutDetail}</p></div><Button onClick={signInWithGoogle} disabled={busy} className="mt-7 h-12 w-full rounded-full bg-[#103c2e] text-white hover:bg-[#0b3024]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Continue with Google</Button><p className="mt-4 text-center text-[11px] leading-5 text-[#789087]">Google sign-in routes approved clients to their portal and the Brand Mint CEO to the Agency OS.</p>{error ? <div role="alert" className="mt-5 rounded-xl border border-[#f0c9be] bg-[#fff1ec] px-4 py-3 text-xs leading-5 text-[#9d4431]"><p>{error}</p>{hasFirebaseSession && !isAuthenticated && !loading ? <button type="button" className="mt-2 font-bold underline underline-offset-2" onClick={() => { setError(null); void refresh(); }}>Retry account check</button> : null}</div> : null}</section></main>;
}

