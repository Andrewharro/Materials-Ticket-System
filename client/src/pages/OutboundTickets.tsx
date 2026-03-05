import TicketTable from "@/components/TicketTable";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { apiPost } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

export default function OutboundTickets() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleNew = async () => {
    try {
      const ticket = await apiPost<any>("/api/tickets", {
        direction: "OUTBOUND",
        status: "New",
        statusKey: "NEW",
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setLocation(`/tickets/${ticket.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight" data-testid="text-outbound-title">Outbound Tickets</h1>
        <Button onClick={handleNew} data-testid="button-new-ticket">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>
      <TicketTable direction="OUTBOUND" />
    </div>
  );
}
