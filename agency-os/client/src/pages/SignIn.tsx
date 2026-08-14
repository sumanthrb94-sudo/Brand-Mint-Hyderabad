import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import {
  confirmFirebasePhoneLogin,
  consumeLoginReturnPath,
  createPhoneRecaptcha,
  firebaseAuth,
  safeReturnPath,
  startFirebaseGoogleLogin,
  startFirebasePhoneLogin,
} from "@/lib/firebase";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { ArrowLeft, Loader2, Phone, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

function requestedPath() {
  if (typeof window === "undefined") return "/admin";
  return safeReturnPath(new URLSearchParams(window.location.search).get("returnTo"));
}

export default function SignIn() {
  const { isAuthenticated, loading, user } = useAuth();
  const [returnTo] = useState(requestedPath);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState<"google" | "phone" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!firebaseAuth() || verifierRef.current) return;
    try {
      verifierRef.current = createPhoneRecaptcha("phone-recaptcha");
      void verifierRef.current.render();
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Phone verification could not be prepared");
    }
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    const destination = user?.role === "admin" ? returnTo : returnTo === "/admin" ? "/portal" : returnTo;
    window.location.assign(destination);
  }, [isAuthenticated, loading, returnTo, user?.role]);

  const signInWithGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await startFirebaseGoogleLogin(returnTo);
    } catch (loginError) {
      setBusy(null);
      setError(loginError instanceof Error ? loginError.message : "Google sign-in could not start");
    }
  };

  const sendPhoneCode = async () => {
    if (!verifierRef.current) {
      setError("Phone verification is still preparing. Please try again in a moment.");
      return;
    }
    setError(null);
    setBusy("phone");
    try {
      const result = await startFirebasePhoneLogin(phoneNumber.trim(), verifierRef.current, returnTo);
      setConfirmation(result);
    } catch (phoneError) {
      setError(phoneError instanceof Error ? phoneError.message : "The SMS code could not be sent");
      verifierRef.current.clear();
      verifierRef.current = createPhoneRecaptcha("phone-recaptcha");
      void verifierRef.current.render();
    } finally {
      setBusy(null);
    }
  };

  const verifyPhoneCode = async () => {
    if (!confirmation) return;
    setError(null);
    setBusy("verify");
    try {
      await confirmFirebasePhoneLogin(confirmation, verificationCode.trim());
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "The verification code was not accepted");
      setBusy(null);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f6f0e6] px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(145,255,190,.22),transparent_24rem),linear-gradient(rgba(23,59,46,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,59,46,.045)_1px,transparent_1px)] bg-[auto,54px_54px,54px_54px]" />
      <section className="relative w-full max-w-md rounded-[28px] border border-[#d7cbbb] bg-[#fffdf8]/95 p-7 shadow-[16px_18px_0_#e5d8c5] sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#577168] hover:text-[#103c2e]"><ArrowLeft className="h-3.5 w-3.5" />Back to Brand Mint</Link>
        <div className="mt-8"><BrandMark /><p className="eyebrow mt-8">Secure access</p><h1 className="mt-3 font-display text-4xl tracking-[-0.055em] text-[#14392d]">Sign in to continue.</h1><p className="mt-3 text-sm leading-6 text-[#668078]">Use Google or phone verification. Administrator access is granted only to the approved Brand Mint CEO account.</p></div>
        <Button onClick={signInWithGoogle} disabled={busy !== null} className="mt-7 h-12 w-full rounded-full bg-[#103c2e] text-white hover:bg-[#0b3024]">{busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Continue with Google</Button>
        <div className="my-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8ba097]"><span className="h-px flex-1 bg-[#dbe6df]" />or<span className="h-px flex-1 bg-[#dbe6df]" /></div>
        {!confirmation ? <div className="space-y-3"><label className="text-xs font-bold text-[#35564a]" htmlFor="phone-number">Phone number</label><input id="phone-number" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+91 98765 43210" inputMode="tel" autoComplete="tel" className="h-12 w-full rounded-xl border border-[#d6e3dc] bg-white px-4 text-sm outline-none ring-[#a8ffcf] transition focus:ring-2" /><Button onClick={sendPhoneCode} disabled={busy !== null} variant="outline" className="h-12 w-full rounded-full border-[#b9d4c7] text-[#103c2e] hover:bg-[#e9f7ef]">{busy === "phone" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}Send SMS code</Button><p className="text-[11px] leading-5 text-[#789087]">Use a country code. Firebase may limit SMS sends while the project is on its current quota.</p></div> : <div className="space-y-3"><label className="text-xs font-bold text-[#35564a]" htmlFor="verification-code">6-digit verification code</label><input id="verification-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" className="h-12 w-full rounded-xl border border-[#d6e3dc] bg-white px-4 text-center text-lg tracking-[0.34em] outline-none ring-[#a8ffcf] transition focus:ring-2" /><Button onClick={verifyPhoneCode} disabled={busy !== null} className="h-12 w-full rounded-full bg-[#103c2e] text-white hover:bg-[#0b3024]">{busy === "verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and continue"}</Button><button type="button" className="w-full text-xs font-bold text-[#527267] hover:text-[#103c2e]" onClick={() => { setConfirmation(null); setVerificationCode(""); }}>Use a different number</button></div>}
        <div id="phone-recaptcha" />
        {error ? <p role="alert" className="mt-5 rounded-xl border border-[#f0c9be] bg-[#fff1ec] px-4 py-3 text-xs leading-5 text-[#9d4431]">{error}</p> : null}
      </section>
    </main>
  );
}
