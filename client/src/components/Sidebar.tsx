import { Link, useLocation } from "wouter";
import { LayoutDashboard, Inbox, Send, Settings, Users, Database, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbound", label: "Inbound Tickets", icon: Inbox },
    { href: "/outbound", label: "Outbound Tickets", icon: Send },
  ];

  const settingItems = [
    { href: "/settings/users", label: "Users & Roles", icon: Users },
    { href: "/settings/reference", label: "Reference Data", icon: Database },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Materials OS</h1>
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium cursor-pointer",
                active ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"
              )}>
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}

        <div className="mt-8 mb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Settings
        </div>
        {settingItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium cursor-pointer",
                active ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"
              )}>
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">
            AU
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">admin@example.com</p>
          </div>
        </div>
        <Link href="/login">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium text-slate-400 hover:text-white cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
