import { Bell, ClipboardList, FileText, LayoutDashboard, ReceiptText, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { BrandMark } from "./BrandMark";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Client onboarding", href: "/onboarding", icon: Users },
  { label: "Projects", href: "/deliverables", icon: ClipboardList },
  { label: "Invoices", href: "/operations", icon: ReceiptText },
  { label: "Documents", href: "/operations", icon: FileText },
];

export function AgencyNav() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const notificationFeed = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin", retry: false });
  const latestNotification = notificationFeed.data?.notifications[0];

  return (
    <aside className="agency-sidebar">
      <div className="flex items-center justify-between">
        <BrandMark />
        <span className="rounded-full border border-[#dbe9e2] bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#527065]">OS</span>
      </div>

      <nav className="mt-12 space-y-1" aria-label="Operations navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href.replace("/#", "/"));
          return (
            <Link key={item.label} href={item.href} className={`agency-nav-item ${active ? "is-active" : ""}`}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-[#dbe9e2] bg-white/75 p-4">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#163d31]">
          <Bell className="h-3.5 w-3.5 text-[#07985c]" />
          Alerts {notificationFeed.data?.notifications.length ? `(${notificationFeed.data.notifications.length})` : ""}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#668077]">{latestNotification?.title ?? "New client, document and invoice activity will appear here."}</p>
      </div>

      <Link href="/portal" className="mt-4 flex items-center justify-between rounded-xl px-3 py-3 text-[11px] font-semibold text-[#47655a] transition-colors hover:bg-white">
        Client portal
        <span aria-hidden="true">↗</span>
      </Link>
    </aside>
  );
}
