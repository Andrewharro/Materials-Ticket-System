import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Send, Clock, CheckCircle } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: inboundData } = useQuery({
    queryKey: ["tickets-inbound-stats"],
    queryFn: () => apiGet<any>("/api/tickets?direction=INBOUND&pageSize=1"),
  });

  const { data: outboundData } = useQuery({
    queryKey: ["tickets-outbound-stats"],
    queryFn: () => apiGet<any>("/api/tickets?direction=OUTBOUND&pageSize=1"),
  });

  const { data: recentData } = useQuery({
    queryKey: ["tickets-recent"],
    queryFn: () => apiGet<any>("/api/tickets?pageSize=10"),
  });

  const inboundCount = inboundData?.total ?? 0;
  const outboundCount = outboundData?.total ?? 0;
  const recentTickets = recentData?.tickets ?? [];

  const stats = [
    { label: "Inbound Tickets", value: inboundCount, icon: Inbox, color: "text-blue-600" },
    { label: "Outbound Tickets", value: outboundCount, icon: Send, color: "text-purple-600" },
    { label: "Total Tickets", value: inboundCount + outboundCount, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8" data-testid="text-dashboard-title">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="shadow-sm border-slate-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-900" data-testid={`text-stat-${i}`}>{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-full bg-slate-100 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-slate-500 py-4 text-center">No tickets yet. Create one from the Inbound or Outbound page.</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket: any) => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" data-testid={`card-ticket-${ticket.id}`}>
                    <div>
                      <p className="font-medium text-slate-900">Ticket #{ticket.id}</p>
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
