import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Send, Clock, CheckCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FilterKey = "inbound" | "outbound" | "new" | "open" | "onhold" | "closed" | null;

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>(null);
  const [ticketsExpanded, setTicketsExpanded] = useState(true);

  const { data: inboundData } = useQuery({
    queryKey: ["tickets-inbound-stats"],
    queryFn: () => apiGet<any>("/api/tickets?direction=INBOUND&pageSize=1"),
  });

  const { data: outboundData } = useQuery({
    queryKey: ["tickets-outbound-stats"],
    queryFn: () => apiGet<any>("/api/tickets?direction=OUTBOUND&pageSize=1"),
  });

  const { data: newData } = useQuery({
    queryKey: ["tickets-new-stats"],
    queryFn: () => apiGet<any>("/api/tickets?status=New&pageSize=1"),
  });

  const { data: openData } = useQuery({
    queryKey: ["tickets-open-stats"],
    queryFn: () => apiGet<any>("/api/tickets?status=Open&pageSize=1"),
  });

  const { data: onholdData } = useQuery({
    queryKey: ["tickets-onhold-stats"],
    queryFn: () => apiGet<any>("/api/tickets?status=On Hold&pageSize=1"),
  });

  const { data: closedData } = useQuery({
    queryKey: ["tickets-closed-stats"],
    queryFn: () => apiGet<any>("/api/tickets?status=Closed&pageSize=1"),
  });

  const listParams = new URLSearchParams({ pageSize: "20", sortBy: "id", sortOrder: "desc" });
  if (activeFilter === "inbound") listParams.set("direction", "INBOUND");
  if (activeFilter === "outbound") listParams.set("direction", "OUTBOUND");
  if (activeFilter === "new") listParams.set("status", "New");
  if (activeFilter === "open") listParams.set("status", "Open");
  if (activeFilter === "onhold") listParams.set("status", "On Hold");
  if (activeFilter === "closed") listParams.set("status", "Closed");

  const { data: listData } = useQuery({
    queryKey: ["tickets-dashboard-list", activeFilter],
    queryFn: () => apiGet<any>(`/api/tickets?${listParams.toString()}`),
  });

  const inboundCount = inboundData?.total ?? 0;
  const outboundCount = outboundData?.total ?? 0;
  const newCount = newData?.total ?? 0;
  const openCount = openData?.total ?? 0;
  const onholdCount = onholdData?.total ?? 0;
  const closedCount = closedData?.total ?? 0;
  const filteredTickets = listData?.tickets ?? [];
  const filteredTotal = listData?.total ?? 0;

  const stats: { key: FilterKey; label: string; value: number; icon: any; color: string; ring: string }[] = [
    { key: "inbound", label: "Inbound", value: inboundCount, icon: Inbox, color: "text-blue-600", ring: "ring-blue-400" },
    { key: "outbound", label: "Outbound", value: outboundCount, icon: Send, color: "text-purple-600", ring: "ring-purple-400" },
    { key: "new", label: "New", value: newCount, icon: Clock, color: "text-sky-600", ring: "ring-sky-400" },
    { key: "open", label: "Open", value: openCount, icon: CheckCircle, color: "text-amber-600", ring: "ring-amber-400" },
    { key: "onhold", label: "On Hold", value: onholdCount, icon: Clock, color: "text-orange-600", ring: "ring-orange-400" },
    { key: "closed", label: "Closed", value: closedCount, icon: CheckCircle, color: "text-green-600", ring: "ring-green-400" },
  ];

  const toggleFilter = (key: FilterKey) => {
    setActiveFilter(prev => prev === key ? null : key);
  };

  const listTitle = activeFilter
    ? `${stats.find(s => s.key === activeFilter)?.label} Tickets (${filteredTotal})`
    : `Recent Tickets (${filteredTotal})`;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8" data-testid="text-dashboard-title">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => {
          const isActive = activeFilter === stat.key;
          return (
            <Card
              key={stat.key}
              onClick={() => toggleFilter(stat.key)}
              data-testid={`card-stat-${stat.key}`}
              className={cn(
                "shadow-sm border-slate-200 cursor-pointer transition-all hover:shadow-md",
                isActive && `ring-2 ${stat.ring} shadow-md`
              )}
            >
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className={cn("p-2.5 rounded-full bg-slate-100 mb-3", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900" data-testid={`text-stat-${stat.key}`}>{stat.value}</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer select-none"
          onClick={() => setTicketsExpanded(prev => !prev)}
          data-testid="button-toggle-tickets"
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{listTitle}</CardTitle>
            {ticketsExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
          {activeFilter && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveFilter(null); }}
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              data-testid="button-clear-filter"
            >
              <X className="w-4 h-4" /> Clear filter
            </button>
          )}
        </CardHeader>
        {ticketsExpanded && (
          <CardContent>
            {filteredTickets.length === 0 ? (
              <p className="text-slate-500 py-4 text-center">No tickets found.</p>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket: any) => (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" data-testid={`card-ticket-${ticket.id}`}>
                      <div>
                        <p className="font-medium text-slate-900">Ticket #{ticket.legacyId || ticket.id}</p>
                        <p className="text-sm text-slate-500">{ticket.projectName || "No project"} &middot; {ticket.direction}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={statusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

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
