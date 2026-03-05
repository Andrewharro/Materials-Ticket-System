import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function TicketTable({ direction, tickets }: { direction: "INBOUND" | "OUTBOUND", tickets: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        t.id.toString().includes(lowerSearch) ||
        t.serviceOrder.toLowerCase().includes(lowerSearch) ||
        t.ownerName.toLowerCase().includes(lowerSearch) ||
        t.projectName.toLowerCase().includes(lowerSearch)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <Input 
          placeholder="Search tickets..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-white"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service Order</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium text-blue-600">
                  <Link href={`/tickets/${ticket.id}`}>
                    <span className="cursor-pointer hover:underline">#{ticket.id}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    ticket.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    ticket.status === 'Closed' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.serviceOrder}</TableCell>
                <TableCell>{ticket.projectName}</TableCell>
                <TableCell>{ticket.ownerName}</TableCell>
                <TableCell>{ticket.assignedToName}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/tickets/${ticket.id}`}>
                    <span className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">View</span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filteredTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No tickets found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
