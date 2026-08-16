import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { AdminGuard } from "@/components/AdminGuard";
import PublicHome from "@/pages/PublicHome";
import SignIn from "@/pages/SignIn";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense } from "react";

/**
 * Everything behind a sign-in is loaded on demand.
 *
 * The public homepage is where every campaign click lands, and it was shipping
 * the admin workspace, the project detail view, the deliverables screen and the
 * onboarding flow to visitors who will never see any of them. Route-level
 * splitting keeps the first paint to the page actually being read.
 */
const Home = lazy(() => import("@/pages/Home"));
const ClientPortal = lazy(() => import("@/pages/ClientPortal"));
const AdminWorkspace = lazy(() => import("@/pages/AdminWorkspace"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const Deliverables = lazy(() => import("@/pages/Deliverables"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  // A single-page app changes the URL without a reload, so every route after
  // the first would be invisible in GA4 without this.
  const [location] = useLocation();
  useEffect(() => { trackPageView(location); }, [location]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f8f4]" aria-busy="true" />}>
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/admin" component={() => <AdminGuard><Home /></AdminGuard>} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/portal" component={ClientPortal} />
      <Route path="/projects/:id" component={() => <AdminGuard><ProjectDetail /></AdminGuard>} />
      <Route path="/operations" component={() => <AdminGuard><AdminWorkspace /></AdminGuard>} />
      <Route path="/deliverables" component={() => <AdminGuard><Deliverables /></AdminGuard>} />
      <Route path="/terms" component={() => <LegalPage type="terms" />} />
      <Route path="/privacy" component={() => <LegalPage type="privacy" />} />
      <Route path="/cookies" component={() => <LegalPage type="cookies" />} />
      <Route path="/refund-policy" component={() => <LegalPage type="refund" />} />
      <Route path="/shipping-policy" component={() => <LegalPage type="shipping" />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider><Toaster /><Router /></TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
