import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f6f0e6] px-5"><div className="text-center"><BrandMark /><p className="eyebrow mt-6">Checking CEO access</p></div></main>;
  if (!isAuthenticated) return <AccessMessage title="CEO sign-in required" detail="Sign in with the Brand Mint Studios CEO/admin account to manage records." action="Sign in" onAction={() => startLogin()} />;
  if (user?.role !== "admin") return <AccessMessage title="CEO access required" detail="This workspace is available only to the Brand Mint Studios CEO/admin role." />;
  return <>{children}</>;
}

function AccessMessage({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f6f0e6] px-5"><div className="absolute inset-0 bg-[linear-gradient(rgba(23,59,46,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,59,46,.045)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent)]" /><section className="relative w-full max-w-md rounded-[26px] border border-[#d7cbbb] bg-[#fffdf8]/90 p-8 text-center shadow-[16px_18px_0_#e5d8c5]"><div className="mx-auto w-fit"><BrandMark /></div><p className="eyebrow mt-9">Protected workspace</p><h1 className="mt-3 font-display text-4xl tracking-[-0.055em] text-[#14392d]">{title}</h1><p className="mt-4 text-sm leading-6 text-[#668078]">{detail}</p>{action ? <Button onClick={onAction} className="mt-7 rounded-full bg-[#103c2e] px-5 text-white hover:bg-[#0b3024]">{action}</Button> : null}</section></main>;
}
