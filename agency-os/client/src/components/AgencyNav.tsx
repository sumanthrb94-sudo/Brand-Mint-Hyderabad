import { Bell, ClipboardList, FileText, LayoutDashboard, Menu, ReceiptText, Users, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Projects", href: "/deliverables", icon: ClipboardList },
  { label: "Invoices", href: "/operations", icon: ReceiptText },
  { label: "Documents", href: "/operations", icon: FileText },
  { label: "Add a client", href: "/onboarding", icon: Users },
];

function useAdminNotifications() {
  const { isAuthenticated, user } = useAuth();
  const feed = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin", retry: false });
  return feed.data?.notifications ?? [];
}

function NavItems({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href);
        return (
          <Link key={item.label} href={item.href} onClick={onNavigate} className={`agency-nav-item ${active ? "is-active" : ""}`}>
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

/**
 * The sidebar is desktop-only by design, so on a phone this drawer is the sole
 * route to /operations and /deliverables. Without it those pages — invoicing,
 * documents, project creation — are unreachable on mobile.
 */
export function AgencyMobileNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const notifications = useAdminNotifications();

  // A route change must close the drawer, or it covers the page it navigated to.
  useEffect(() => setOpen(false), [location]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-[#dbe9e2] bg-white text-[#446359]"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        {!open && notifications.length ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#0d8855] px-1 text-[9px] font-bold text-white">{notifications.length}</span> : null}
      </button>

      {open ? (
        <>
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-[#0d2018]/25" />
          <nav aria-label="Operations navigation" className="fixed inset-x-3 top-16 z-40 grid gap-1 rounded-2xl border border-[#dbe9e2] bg-[#fbfdfa] p-3 shadow-[0_20px_50px_rgba(17,47,36,.18)]">
            <NavItems location={location} onNavigate={() => setOpen(false)} />
            <Link href="/portal" onClick={() => setOpen(false)} className="mt-1 flex items-center justify-between rounded-xl px-3 py-3 text-[11px] font-semibold text-[#47655a] hover:bg-white">
              Client portal
              <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </>
      ) : null}
    </div>
  );
}

export function AgencyNav() {
  const [location] = useLocation();
  const notifications = useAdminNotifications();

  return (
    <aside className="agency-sidebar">
      <div className="flex items-center justify-between">
        <BrandMark />
        <span className="rounded-full border border-[#dbe9e2] bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#527065]">OS</span>
      </div>

      <nav className="mt-12 space-y-1" aria-label="Operations navigation">
        <NavItems location={location} />
      </nav>

      <div className="mt-auto rounded-2xl border border-[#dbe9e2] bg-white/75 p-4">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#163d31]">
          <Bell className="h-3.5 w-3.5 text-[#07985c]" />
          Alerts {notifications.length ? `(${notifications.length})` : ""}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#668077]">{notifications[0]?.title ?? "New client, document and invoice activity will appear here."}</p>
      </div>

      <Link href="/portal" className="mt-4 flex items-center justify-between rounded-xl px-3 py-3 text-[11px] font-semibold text-[#47655a] transition-colors hover:bg-white">
        Client portal
        <span aria-hidden="true">↗</span>
      </Link>
    </aside>
  );
}
