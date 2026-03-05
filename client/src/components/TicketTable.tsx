import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/auth";

function statusColor(status: string) {
  switch (status) {
    case "New": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Open":
    case "In Progress": return "bg-amber-50 text-amber-700 border-amber-200";
    case "Closed": return "bg-green-50 text-green-700 border-green-200";
    case "On Hold": return "bg-orange-50 text-orange-700 border-orange-200";
    default: return "bg-slate-100 text-slate-700";
  }
}

export default function TicketTable({ direction }: { direction: "INBOUND" | "OUTBOUND" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const params = new URLSearchParams();
  params.set("direction", direction);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  if (statusFilter !== "All") params.set("status", statusFilter);
  if (searchTerm) params.set("search", searchTerm);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", direction, statusFilter, searchTerm, page],
    queryFn: () => apiGet<any>(`/api/tickets?${params.toString()}`),
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="max-w-sm bg-white"
          data-testid="input-search"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-white" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
            <SelectItem value="Not Assigned">Not Assigned</SelectItem>
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
              <TableHead>State</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading...</TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : tickets.map((ticket: any) => (
              <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                <TableCell className="font-medium text-blue-600">
                  <Link href={`/tickets/${ticket.id}`}>
                    <span className="cursor-pointer hover:underline" data-testid={`link-ticket-${ticket.id}`}>#{ticket.id}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.serviceOrder || "—"}</TableCell>
                <TableCell>{ticket.projectName || "—"}</TableCell>
                <TableCell>{ticket.state || "—"}</TableCell>
                <TableCell>{ticket.ownerName || "—"}</TableCell>
                <TableCell>{ticket.assignedToName || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">{total} ticket{total !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
