import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Send, Clock, CheckCircle, X, Package, FileText } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Tooltip, Legend, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Line, ComposedChart, Bar,
} from "recharts";

type FilterKey = "inbound" | "outbound" | "new" | "open" | "onhold" | "closed" | null;

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>(null);

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

  const chartParams = new URLSearchParams();
  if (activeFilter === "inbound") chartParams.set("direction", "INBOUND");
  if (activeFilter === "outbound") chartParams.set("direction", "OUTBOUND");
  if (activeFilter === "new") chartParams.set("status", "New");
  if (activeFilter === "open") chartParams.set("status", "Open");
  if (activeFilter === "onhold") chartParams.set("status", "On Hold");
  if (activeFilter === "closed") chartParams.set("status", "Closed");

  const { data: chartData } = useQuery({
    queryKey: ["dashboard-charts", activeFilter],
    queryFn: () => apiGet<{ byProject: { name: string; count: number; items: number }[]; byMonth: { month: string; count: number; items: number }[] }>(
      `/api/dashboard/stats?${chartParams.toString()}`
    ),
  });

  const inboundCount = inboundData?.total ?? 0;
  const outboundCount = outboundData?.total ?? 0;
  const newCount = newData?.total ?? 0;
  const openCount = openData?.total ?? 0;
  const onholdCount = onholdData?.total ?? 0;
  const closedCount = closedData?.total ?? 0;

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

  const projectData = chartData?.byProject ?? [];
  const monthData = (chartData?.byMonth ?? []).map(m => ({
    ...m,
    label: formatMonth(m.month),
  }));

  const filterLabel = activeFilter
    ? stats.find(s => s.key === activeFilter)?.label
    : null;

  const maxTickets = projectData.length > 0 ? projectData[0].count : 1;

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

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-600">
            Filtered by: <span className="font-semibold">{filterLabel}</span>
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            data-testid="button-clear-filter"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
        <Card className="shadow-sm border-slate-200 xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tickets by Project</CardTitle>
            <div className="flex items-center gap-6 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Tickets</span>
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Items</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {projectData.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No data</p>
            ) : (
              <div className="space-y-1">
                {projectData.map((project, idx) => {
                  const barWidth = Math.max(4, (project.count / maxTickets) * 100);
                  return (
                    <div
                      key={project.name}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        idx % 2 === 0 ? "bg-slate-50" : "bg-white"
                      )}
                      data-testid={`row-project-${idx}`}
                    >
                      <span className="text-xs font-medium text-slate-400 w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{project.count.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">tickets</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-right">
                          <p className="text-sm font-semibold text-amber-600">{project.items.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">items</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Tickets & Items per Month</CardTitle>
          </CardHeader>
          <CardContent>
            {monthData.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: "Tickets", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#3b82f6" } }} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: "Items", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "#f59e0b" } }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="items" name="Items" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${year}`;
}
