import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Columns3, GripVertical, Eye, EyeOff } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ColumnDef {
  key: string;
  label: string;
  render?: (ticket: any) => React.ReactNode;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "id", label: "ID" },
  { key: "status", label: "Status" },
  { key: "serviceOrder", label: "Service Order" },
  { key: "projectName", label: "Project" },
  { key: "state", label: "State" },
  { key: "ownerName", label: "Owner" },
  { key: "assignedToName", label: "Assigned To" },
  { key: "priority", label: "Priority" },
  { key: "warehouse", label: "Warehouse" },
  { key: "ownerEmail", label: "Owner Email" },
  { key: "assignedToEmail", label: "Assigned Email" },
  { key: "deliveryOrPickup", label: "Delivery/Pickup" },
  { key: "deliveringTo", label: "Delivering To" },
  { key: "siteNameCoordinates", label: "Site/Coordinates" },
  { key: "deliveryAddress", label: "Delivery Address" },
  { key: "requestedDeliveryDate", label: "Requested Delivery" },
  { key: "deliveryTimeSlots", label: "Delivery Time Slots" },
  { key: "driverKey", label: "Driver" },
  { key: "deliverySignoff", label: "Delivery Signoff" },
  { key: "accessConditions", label: "Access Conditions" },
  { key: "liftingEquipment", label: "Lifting Equipment" },
  { key: "steelWork", label: "Steel Work" },
  { key: "receiversName", label: "Receiver Name" },
  { key: "receiversPhone", label: "Receiver Phone" },
  { key: "pickupDate", label: "Pickup Date" },
  { key: "pickupTime", label: "Pickup Time" },
  { key: "subcontractorName", label: "Subcontractor" },
  { key: "subcontractorEmail", label: "Subcontractor Email" },
  { key: "internalComments", label: "Internal Comments" },
  { key: "goodsReceipt", label: "Goods Receipt" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "closedAt", label: "Closed" },
];

const DEFAULT_VISIBLE = ["id", "status", "serviceOrder", "projectName", "state", "ownerName", "assignedToName"];

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

function formatCellValue(key: string, ticket: any): React.ReactNode {
  const val = ticket[key];
  if (key === "id") {
    return (
      <Link href={`/tickets/${ticket.id}`}>
        <span className="cursor-pointer hover:underline text-blue-600 font-medium" data-testid={`link-ticket-${ticket.id}`}>#{ticket.id}</span>
      </Link>
    );
  }
  if (key === "status") {
    return <Badge variant="outline" className={statusColor(val)}>{val}</Badge>;
  }
  if (["createdAt", "updatedAt", "closedAt", "requestedDeliveryDate", "pickupDate"].includes(key)) {
    return val ? new Date(val).toLocaleDateString() : "—";
  }
  return val || "—";
}

function getStorageKey(direction: string) {
  return `ticketColumns_${direction}`;
}

function loadColumnConfig(direction: string): string[] {
  try {
    const saved = localStorage.getItem(getStorageKey(direction));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_VISIBLE;
}

function saveColumnConfig(direction: string, columns: string[]) {
  localStorage.setItem(getStorageKey(direction), JSON.stringify(columns));
}

function ColumnConfigPanel({ direction, visibleColumns, onUpdate }: {
  direction: string;
  visibleColumns: string[];
  onUpdate: (cols: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [orderedCols, setOrderedCols] = useState<string[]>(visibleColumns);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrderedCols(visibleColumns);
  }, [visibleColumns]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allKeys = ALL_COLUMNS.map(c => c.key);
  const hiddenCols = allKeys.filter(k => !orderedCols.includes(k));

  const toggleColumn = (key: string) => {
    let updated: string[];
    if (orderedCols.includes(key)) {
      if (orderedCols.length <= 1) return;
      updated = orderedCols.filter(k => k !== key);
    } else {
      updated = [...orderedCols, key];
    }
    setOrderedCols(updated);
    onUpdate(updated);
    saveColumnConfig(direction, updated);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...orderedCols];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setDragIdx(idx);
    setOrderedCols(updated);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    onUpdate(orderedCols);
    saveColumnConfig(direction, orderedCols);
  };

  const colLabel = (key: string) => ALL_COLUMNS.find(c => c.key === key)?.label || key;

  return (
    <div ref={panelRef} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} data-testid="button-columns">
        <Columns3 className="w-4 h-4 mr-1" /> Columns
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-white shadow-lg max-h-[70vh] flex flex-col">
          <div className="px-3 py-2 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            Visible Columns (drag to reorder)
          </div>
          <div className="overflow-y-auto flex-1">
            {orderedCols.map((key, idx) => (
              <div
                key={key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm cursor-grab border-b border-slate-100 hover:bg-slate-50",
                  dragIdx === idx && "bg-blue-50"
                )}
              >
                <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <span className="flex-1 truncate">{colLabel(key)}</span>
                <button
                  type="button"
                  onClick={() => toggleColumn(key)}
                  className="p-0.5 rounded hover:bg-slate-200 text-blue-600"
                  data-testid={`button-hide-col-${key}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {hiddenCols.length > 0 && (
              <>
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-t">
                  Hidden Columns
                </div>
                {hiddenCols.map(key => (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-slate-100 hover:bg-slate-50 text-slate-400"
                  >
                    <div className="w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{colLabel(key)}</span>
                    <button
                      type="button"
                      onClick={() => toggleColumn(key)}
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600"
                      data-testid={`button-show-col-${key}`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketTable({ direction }: { direction: "INBOUND" | "OUTBOUND" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => loadColumnConfig(direction));

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
  const colCount = visibleColumns.length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6 items-center">
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
        <div className="ml-auto">
          <ColumnConfigPanel
            direction={direction}
            visibleColumns={visibleColumns}
            onUpdate={setVisibleColumns}
          />
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {visibleColumns.map(key => (
                <TableHead key={key} className="whitespace-nowrap">
                  {ALL_COLUMNS.find(c => c.key === key)?.label || key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-slate-500">Loading...</TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-slate-500">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : tickets.map((ticket: any) => (
              <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                {visibleColumns.map(key => (
                  <TableCell key={key} className="whitespace-nowrap">
                    {formatCellValue(key, ticket)}
                  </TableCell>
                ))}
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
