import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f6f8f4] px-5"><p className="eyebrow">Checking CEO access</p></main>;
  if (!isAuthenticated) return <AccessMessage title="CEO sign-in required" detail="Sign in with the Brand Mint Studios CEO/admin account to manage records." action="Sign in" onAction={() => startLogin()} />;
  if (user?.role !== "admin") return <AccessMessage title="CEO access required" detail="This workspace is available only to the Brand Mint Studios CEO/admin role." />;
  return <>{children}</>;
}

function AccessMessage({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#f6f8f4] px-5"><section className="max-w-md rounded-3xl border border-[#dbe9e2] bg-white p-8 text-center"><p className="eyebrow">Brand Mint Studios</p><h1 className="mt-3 font-display text-4xl tracking-[-0.055em] text-[#14392d]">{title}</h1><p className="mt-4 text-sm leading-6 text-[#668078]">{detail}</p>{action ? <Button onClick={onAction} className="mt-7 bg-[#103c2e] text-white hover:bg-[#0b3024]">{action}</Button> : null}</section></main>;
}
