import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Send, Clock, CheckCircle, X } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart,
} from "recharts";

type FilterKey = "inbound" | "outbound" | "new" | "open" | "onhold" | "closed" | null;

const PIE_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
  "#84cc16", "#a855f7", "#0ea5e9", "#22c55e", "#e11d48",
];

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
    queryFn: () => apiGet<{ byProject: { name: string; count: number }[]; byMonth: { month: string; count: number; items: number }[] }>(
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
            Showing charts for: <span className="font-semibold">{filterLabel}</span>
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            data-testid="button-clear-filter"
          >
            <X className="w-4 h-4" /> Clear filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Tickets by Project</CardTitle>
          </CardHeader>
          <CardContent>
            {projectData.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={projectData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {projectData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "Tickets"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Tickets & Items per Month</CardTitle>
          </CardHeader>
          <CardContent>
            {monthData.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
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
