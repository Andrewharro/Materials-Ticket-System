import { Link, useLocation } from "wouter";
import { LayoutDashboard, Inbox, Send, Users, Database, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getStoredUser } from "@/lib/auth";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const user = getStoredUser();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inbound", label: "Inbound Tickets", icon: Inbox },
    { href: "/outbound", label: "Outbound Tickets", icon: Send },
  ];

  const isAdmin = user?.role === "ADMIN";
  const isSubcontractor = user?.role === "SUBCONTRACTOR";

  const settingItems = [
    { href: "/settings/users", label: "Users & Roles", icon: Users },
    { href: "/settings/reference", label: "Reference Data", icon: Database },
  ];

  const handleLogout = () => {
    clearAuth();
    setLocation("/login");
  };

  const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` : "??";

  return (
    <aside
      className={cn(
        "bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      data-testid="sidebar"
    >
      <div className={cn("flex items-center border-b border-slate-800", collapsed ? "p-3 justify-center" : "p-6 justify-between")}>
        {!collapsed && <h1 className="text-xl font-bold text-white tracking-tight">Materials OS</h1>}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          data-testid="button-toggle-sidebar"
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.href.replace("/", "")}`}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-md transition-colors text-sm font-medium cursor-pointer",
                  collapsed ? "justify-center px-2 py-2" : "space-x-3 px-3 py-2",
                  active ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="mt-8 mb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Settings
              </div>
            )}
            {collapsed && <div className="mt-4 border-t border-slate-800 pt-3" />}
            {settingItems.map((item) => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-md transition-colors text-sm font-medium cursor-pointer",
                      collapsed ? "justify-center px-2 py-2" : "space-x-3 px-3 py-2",
                      active ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-2 border-t border-slate-800">
        {!collapsed ? (
          <div className="flex items-center space-x-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium text-xs" title={`${user?.firstName} ${user?.lastName}`}>
              {initials}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          data-testid="button-logout"
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center rounded-md hover:bg-slate-800 transition-colors text-sm font-medium text-slate-400 hover:text-white cursor-pointer w-full",
            collapsed ? "justify-center px-2 py-2" : "space-x-3 px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
