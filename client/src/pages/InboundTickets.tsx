import { mockTickets } from "@/lib/mockData";
import TicketTable from "@/components/TicketTable";

export default function InboundTickets() {
  const tickets = mockTickets.filter(t => t.direction === "INBOUND");
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inbound Tickets</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          New Ticket
        </button>
      </div>
      <TicketTable direction="INBOUND" tickets={tickets} />
    </div>
  );
}
