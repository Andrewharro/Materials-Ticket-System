import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Send, Clock, CheckCircle, X, Package, FileText, UserCheck, TrendingUp, Layers, BarChart3, ChevronUp, ChevronDown } from "lucide-react";
import { apiGet } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Tooltip, Legend, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Line, ComposedChart, Bar,
} from "recharts";

type DirectionFilter = "inbound" | "outbound" | null;
type StatusFilter = "new" | "open" | "onhold" | "closed" | null;

const AVATAR_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-cyan-500",
  "bg-fuchsia-500", "bg-teal-500", "bg-pink-500", "bg-indigo-500",
  "bg-lime-500", "bg-sky-500", "bg-orange-500", "bg-purple-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Dashboard() {
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [assigneesOpen, setAssigneesOpen] = useState(true);

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
  if (directionFilter === "inbound") chartParams.set("direction", "INBOUND");
  if (directionFilter === "outbound") chartParams.set("direction", "OUTBOUND");
  if (statusFilter === "new") chartParams.set("status", "New");
  if (statusFilter === "open") chartParams.set("status", "Open");
  if (statusFilter === "onhold") chartParams.set("status", "On Hold");
  if (statusFilter === "closed") chartParams.set("status", "Closed");
  if (projectFilter) chartParams.set("projectName", projectFilter);

  const { data: chartData } = useQuery({
    queryKey: ["dashboard-charts", directionFilter, statusFilter, projectFilter],
    queryFn: () => apiGet<{
      byProject: { name: string; count: number; items: number }[];
      byAssignee: { name: string; count: number; items: number }[];
      byMonth: { month: string; count: number; items: number }[];
    }>(`/api/dashboard/stats?${chartParams.toString()}`),
  });

  const inboundCount = inboundData?.total ?? 0;
  const outboundCount = outboundData?.total ?? 0;
  const newCount = newData?.total ?? 0;
  const openCount = openData?.total ?? 0;
  const onholdCount = onholdData?.total ?? 0;
  const closedCount = closedData?.total ?? 0;

  const directionStats: { key: DirectionFilter; label: string; value: number; icon: any; color: string; ring: string }[] = [
    { key: "inbound", label: "Inbound", value: inboundCount, icon: Inbox, color: "text-blue-600", ring: "ring-blue-400" },
    { key: "outbound", label: "Outbound", value: outboundCount, icon: Send, color: "text-purple-600", ring: "ring-purple-400" },
  ];

  const statusStats: { key: StatusFilter; label: string; value: number; icon: any; color: string; ring: string }[] = [
    { key: "new", label: "New", value: newCount, icon: Clock, color: "text-sky-600", ring: "ring-sky-400" },
    { key: "open", label: "Open", value: openCount, icon: CheckCircle, color: "text-amber-600", ring: "ring-amber-400" },
    { key: "onhold", label: "On Hold", value: onholdCount, icon: Clock, color: "text-orange-600", ring: "ring-orange-400" },
    { key: "closed", label: "Closed", value: closedCount, icon: CheckCircle, color: "text-green-600", ring: "ring-green-400" },
  ];

  const toggleDirection = (key: DirectionFilter) => {
    setDirectionFilter(prev => prev === key ? null : key);
  };

  const toggleStatus = (key: StatusFilter) => {
    setStatusFilter(prev => prev === key ? null : key);
  };

  const toggleProject = (name: string) => {
    setProjectFilter(prev => prev === name ? null : name);
  };

  const projectData = chartData?.byProject ?? [];
  const assigneeData = chartData?.byAssignee ?? [];
  const monthData = (chartData?.byMonth ?? []).map(m => ({
    ...m,
    label: formatMonth(m.month),
  }));

  const hasFilter = directionFilter || statusFilter || projectFilter;
  const filterLabels: string[] = [];
  if (directionFilter) filterLabels.push(directionStats.find(s => s.key === directionFilter)!.label);
  if (statusFilter) filterLabels.push(statusStats.find(s => s.key === statusFilter)!.label);
  if (projectFilter) filterLabels.push(projectFilter);

  const maxProjectTickets = projectData.length > 0 ? projectData[0].count : 1;
  const maxAssigneeTickets = assigneeData.length > 0 ? assigneeData[0].count : 1;

  const totalTickets = monthData.reduce((sum, m) => sum + m.count, 0);
  const totalItems = monthData.reduce((sum, m) => sum + m.items, 0);
  const avgTicketsPerMonth = monthData.length > 0 ? Math.round(totalTickets / monthData.length) : 0;
  const avgItemsPerMonth = monthData.length > 0 ? Math.round(totalItems / monthData.length) : 0;
  const avgItemsPerTicket = totalTickets > 0 ? (totalItems / totalTickets).toFixed(1) : "0";

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8" data-testid="text-dashboard-title">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {directionStats.map((stat) => {
          const isActive = directionFilter === stat.key;
          return (
            <Card
              key={stat.key}
              onClick={() => toggleDirection(stat.key)}
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
        {statusStats.map((stat) => {
          const isActive = statusFilter === stat.key;
          return (
            <Card
              key={stat.key}
              onClick={() => toggleStatus(stat.key)}
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

      {hasFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-600">
            Filtered by: <span className="font-semibold">{filterLabels.join(" + ")}</span>
          </span>
          <button
            onClick={() => { setDirectionFilter(null); setStatusFilter(null); setProjectFilter(null); }}
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            data-testid="button-clear-filter"
          >
            <X className="w-4 h-4" /> Clear all
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tickets by Project</CardTitle>
                <button
                  onClick={() => setProjectsOpen(prev => !prev)}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-muted transition-colors"
                  data-testid="button-toggle-projects"
                  aria-label="Toggle Tickets by Project"
                >
                  {projectsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
              {projectsOpen && (
                <div className="flex items-center gap-6 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Tickets</span>
                  <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Items</span>
                  <span className="ml-auto text-[10px] text-slate-400 italic">Click a project to filter</span>
                </div>
              )}
            </CardHeader>
            {projectsOpen && (
              <CardContent className="pt-0">
                {projectData.length === 0 ? (
                  <p className="text-slate-400 text-center py-12">No data</p>
                ) : (
                  <div className="space-y-1">
                    {projectData.map((project, idx) => {
                      const barWidth = Math.max(4, (project.count / maxProjectTickets) * 100);
                      const isSelected = projectFilter === project.name;
                      return (
                        <div
                          key={project.name}
                          onClick={() => toggleProject(project.name)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
                            isSelected
                              ? "bg-blue-50 ring-2 ring-blue-300 shadow-sm"
                              : idx % 2 === 0 ? "bg-slate-50 hover:bg-slate-100" : "bg-white hover:bg-slate-50"
                          )}
                          data-testid={`row-project-${idx}`}
                        >
                          <span className="text-xs font-medium text-slate-400 w-5 text-right shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", isSelected ? "text-blue-800" : "text-slate-800")}>{project.name}</p>
                            <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", isSelected ? "bg-blue-600" : "bg-blue-500")}
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
            )}
          </Card>

          <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-white to-violet-50/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-violet-100">
                    <UserCheck className="w-4 h-4 text-violet-600" />
                  </div>
                  <CardTitle className="text-lg">Assigned To</CardTitle>
                </div>
                <button
                  onClick={() => setAssigneesOpen(prev => !prev)}
                  className="p-1 rounded-md hover:bg-violet-100 dark:hover:bg-muted transition-colors"
                  data-testid="button-toggle-assignees"
                  aria-label="Toggle Assigned To"
                >
                  {assigneesOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
              {assigneesOpen && (
                <div className="flex items-center gap-6 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Tickets</span>
                  <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Items</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Avg Days Open</span>
                </div>
              )}
            </CardHeader>
            {assigneesOpen && (
              <CardContent className="pt-0">
                {assigneeData.length === 0 ? (
                  <p className="text-slate-400 text-center py-12">No data</p>
                ) : (
                  <div className="space-y-1.5">
                    {assigneeData.map((person, idx) => {
                      const barWidth = Math.max(4, (person.count / maxAssigneeTickets) * 100);
                      const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      return (
                        <div
                          key={person.name}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 border border-violet-100/60 hover:border-violet-200 hover:shadow-sm transition-all"
                          data-testid={`row-assignee-${idx}`}
                        >
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", avatarColor)}>
                            {getInitials(person.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{person.name}</p>
                            <div className="mt-1.5 h-1.5 rounded-full bg-violet-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-violet-700">{person.count.toLocaleString()}</p>
                              <p className="text-[10px] text-violet-400 uppercase tracking-wider">tickets</p>
                            </div>
                            <div className="w-px h-8 bg-violet-200/60" />
                            <div className="text-right">
                              <p className="text-sm font-bold text-fuchsia-600">{person.items.toLocaleString()}</p>
                              <p className="text-[10px] text-fuchsia-400 uppercase tracking-wider">items</p>
                            </div>
                            <div className="w-px h-8 bg-violet-200/60" />
                            <div className="text-right">
                              <p className="text-sm font-bold text-amber-600">{person.avgDaysOpen ?? 0}</p>
                              <p className="text-[10px] text-amber-400 uppercase tracking-wider">avg days</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-100 shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Avg Tickets / Month</p>
                  <h3 className="text-3xl font-bold text-emerald-700 mt-0.5" data-testid="text-avg-tickets-month">{avgTicketsPerMonth.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">across {monthData.length} month{monthData.length !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100 shrink-0">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Avg Items / Month</p>
                  <h3 className="text-3xl font-bold text-amber-700 mt-0.5" data-testid="text-avg-items-month">{avgItemsPerMonth.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{totalItems.toLocaleString()} items total</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-cyan-50/50 to-sky-50/30">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-100 shrink-0">
                  <Layers className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-cyan-600 uppercase tracking-wider">Avg Items / Ticket</p>
                  <h3 className="text-3xl font-bold text-cyan-700 mt-0.5" data-testid="text-avg-items-ticket">{avgItemsPerTicket}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{totalTickets.toLocaleString()} tickets total</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-slate-200 flex-1">
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
    </div>
  );
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${year}`;
}
