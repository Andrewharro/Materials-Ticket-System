import TicketTable from "@/components/TicketTable";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { getStoredUser } from "@/lib/auth";

export default function OutboundTickets() {
  const [, setLocation] = useLocation();
  const user = getStoredUser();
  const isSubcontractor = user?.role === "SUBCONTRACTOR";

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-foreground tracking-tight" data-testid="text-outbound-title">Outbound Tickets</h1>
        {!isSubcontractor && (
          <Button onClick={() => setLocation("/tickets/new?direction=OUTBOUND")} data-testid="button-new-ticket">
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        )}
      </div>
      <TicketTable direction="OUTBOUND" />
    </div>
  );
}
