import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { accessCopy, destinationForRole } from "@/lib/roleRoutes";
import { ArrowRight, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const switchAccount = async () => {
    await logout();
    setLocation("/sign-in?returnTo=%2Fadmin");
  };

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f6f0e6] px-5"><div className="text-center"><BrandMark /><p className="eyebrow mt-6">Checking your workspace</p></div></main>;
  }

  if (!isAuthenticated) {
    return <AccessMessage
      title={accessCopy.signedOutTitle}
      detail={accessCopy.signedOutDetail}
      action="Continue with Google"
      onAction={() => startLogin("/admin")}
      secondaryAction="Explore ecommerce services"
      onSecondaryAction={() => setLocation("/")}
    />;
  }

  if (user?.role !== "admin") {
    return <AccessMessage
      title={accessCopy.signedInTitle}
      detail={accessCopy.signedInDetail}
      action="Open client portal"
      onAction={() => setLocation(destinationForRole(user?.role))}
      secondaryAction="Sign out & switch account"
      onSecondaryAction={() => void switchAccount()}
      secondaryIcon={<LogOut className="h-3.5 w-3.5" />}
    />;
  }

  return <>{children}</>;
}

function AccessMessage({
  title,
  detail,
  action,
  onAction,
  secondaryAction,
  onSecondaryAction,
  secondaryIcon,
}: {
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
  secondaryAction?: string;
  onSecondaryAction?: () => void;
  secondaryIcon?: React.ReactNode;
}) {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f6f0e6] px-5"><div className="absolute inset-0 bg-[linear-gradient(rgba(23,59,46,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,59,46,.045)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent)]" /><section className="relative w-full max-w-md rounded-[26px] border border-[#d7cbbb] bg-[#fffdf8]/90 p-8 text-center shadow-[16px_18px_0_#e5d8c5]"><div className="mx-auto w-fit"><BrandMark /></div><p className="eyebrow mt-9">Brand Mint access</p><h1 className="mt-3 font-display text-4xl tracking-[-0.055em] text-[#14392d]">{title}</h1><p className="mt-4 text-sm leading-6 text-[#668078]">{detail}</p>{action ? <Button onClick={onAction} className="mt-7 w-full rounded-full bg-[#103c2e] px-5 text-white hover:bg-[#0b3024]">{action}<ArrowRight className="ml-2 h-4 w-4" /></Button> : null}{secondaryAction ? <Button type="button" variant="outline" onClick={onSecondaryAction} className="mt-3 w-full rounded-full border-[#b8c8c0] bg-white px-5 text-[#254b3d] hover:bg-[#f3f7f3]">{secondaryIcon}{secondaryAction}</Button> : null}</section></main>;
}
