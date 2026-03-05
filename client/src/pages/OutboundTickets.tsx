import { mockTickets } from "@/lib/mockData";
import TicketTable from "@/components/TicketTable";

export default function OutboundTickets() {
  const tickets = mockTickets.filter(t => t.direction === "OUTBOUND");
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Outbound Tickets</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          New Ticket
        </button>
      </div>
      <TicketTable direction="OUTBOUND" tickets={tickets} />
    </div>
  );
}
