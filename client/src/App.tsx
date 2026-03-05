import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InboundTickets from "./pages/InboundTickets";
import OutboundTickets from "./pages/OutboundTickets";
import TicketDetail from "./pages/TicketDetail";
import SettingsUsers from "./pages/SettingsUsers";
import SettingsReferenceData from "./pages/SettingsReferenceData";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Layout>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/inbound" component={InboundTickets} />
          <Route path="/outbound" component={OutboundTickets} />
          <Route path="/tickets/:id" component={TicketDetail} />
          <Route path="/settings/users" component={SettingsUsers} />
          <Route path="/settings/reference" component={SettingsReferenceData} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
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
