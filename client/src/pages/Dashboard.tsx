import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTickets } from "@/lib/mockData";
import { Inbox, Send, Clock, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const inboundCount = mockTickets.filter(t => t.direction === "INBOUND").length;
  const outboundCount = mockTickets.filter(t => t.direction === "OUTBOUND").length;
  const inProgressCount = mockTickets.filter(t => t.status === "In Progress").length;
  const closedCount = mockTickets.filter(t => t.status === "Closed").length;

  const stats = [
    { label: "Total Inbound", value: inboundCount, icon: Inbox, color: "text-blue-600" },
    { label: "Total Outbound", value: outboundCount, icon: Send, color: "text-purple-600" },
    { label: "In Progress", value: inProgressCount, icon: Clock, color: "text-amber-600" },
    { label: "Closed Tickets", value: closedCount, icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="shadow-sm border-slate-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
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
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTickets.map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">Ticket #{ticket.id} ({ticket.direction})</p>
                  <p className="text-sm text-slate-500">Project: {ticket.projectName}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    ticket.status === 'New' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                    ticket.status === 'Closed' ? 'bg-green-100 text-green-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {ticket.status}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
