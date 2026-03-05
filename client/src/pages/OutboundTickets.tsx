import TicketTable from "@/components/TicketTable";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";

export default function OutboundTickets() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight" data-testid="text-outbound-title">Outbound Tickets</h1>
        <Button onClick={() => setLocation("/tickets/new?direction=OUTBOUND")} data-testid="button-new-ticket">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>
      <TicketTable direction="OUTBOUND" />
    </div>
  );
}
