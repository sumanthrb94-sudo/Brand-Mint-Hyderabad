import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ClientPortal from "@/pages/ClientPortal";
import AdminWorkspace from "@/pages/AdminWorkspace";
import Deliverables from "@/pages/Deliverables";
import { AdminGuard } from "@/components/AdminGuard";
import Home from "@/pages/Home";
import LegalPage from "@/pages/LegalPage";
import Onboarding from "@/pages/Onboarding";
import PublicHome from "@/pages/PublicHome";
import SignIn from "@/pages/SignIn";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/admin" component={() => <AdminGuard><Home /></AdminGuard>} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/portal" component={ClientPortal} />
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
