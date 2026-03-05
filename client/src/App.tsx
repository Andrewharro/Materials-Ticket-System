import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { getToken } from "@/lib/auth";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InboundTickets from "./pages/InboundTickets";
import OutboundTickets from "./pages/OutboundTickets";
import TicketDetail from "./pages/TicketDetail";
import SettingsUsers from "./pages/SettingsUsers";
import SettingsReferenceData from "./pages/SettingsReferenceData";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  if (!getToken()) {
    return <Redirect to="/login" />;
  }
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => getToken() ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/inbound">
        <ProtectedRoute component={InboundTickets} />
      </Route>
      <Route path="/outbound">
        <ProtectedRoute component={OutboundTickets} />
      </Route>
      <Route path="/tickets/new">
        <ProtectedRoute component={TicketDetail} />
      </Route>
      <Route path="/tickets/:id">
        <ProtectedRoute component={TicketDetail} />
      </Route>
      <Route path="/settings/users">
        <ProtectedRoute component={SettingsUsers} />
      </Route>
      <Route path="/settings/reference">
        <ProtectedRoute component={SettingsReferenceData} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
