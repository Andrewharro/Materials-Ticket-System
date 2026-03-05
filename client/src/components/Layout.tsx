import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { getStoredUser, apiGet } from "@/lib/auth";
import { User, Moon, Sun } from "lucide-react";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return [dark, () => setDark(prev => !prev)] as const;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = getStoredUser();
  const isSubcontractor = user?.role === "SUBCONTRACTOR";
  const [companyName, setCompanyName] = useState<string | null>(user?.subcontractorName || null);
  const [dark, toggleDark] = useDarkMode();

  useEffect(() => {
    if (isSubcontractor && !companyName) {
      apiGet<any[]>("/api/admin/subcontractors").then(subs => {
        if (user?.subcontractorId) {
          const match = subs.find((s: any) => s.id === user.subcontractorId);
          if (match) setCompanyName(match.name);
        } else {
          apiGet<any>("/api/auth/me").then(me => {
            if (me?.subcontractorId) {
              const match = subs.find((s: any) => s.id === me.subcontractorId);
              if (match) setCompanyName(match.name);
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [isSubcontractor]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <main className="flex-1 overflow-y-auto">
        {isSubcontractor && companyName ? (
          <div className="flex items-center justify-between bg-blue-600 text-white py-2 px-4" data-testid="text-subcontractor-banner">
            <span className="font-bold text-lg tracking-wide uppercase flex-1 text-center">{companyName}</span>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded-md hover:bg-blue-500 transition-colors"
              data-testid="button-toggle-dark"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        ) : user && !isSubcontractor && (
          <div className="flex items-center justify-end px-6 py-2 border-b border-slate-200 dark:border-border bg-white dark:bg-card" data-testid="text-user-topbar">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-muted-foreground">
              <User className="w-4 h-4 text-slate-400 dark:text-muted-foreground" />
              <span className="font-medium text-slate-800 dark:text-foreground" data-testid="text-user-name">{user.firstName} {user.lastName}</span>
              <span className="text-slate-400 dark:text-muted-foreground">|</span>
              <span className="text-slate-500 dark:text-muted-foreground">{user.role}</span>
              <button
                onClick={toggleDark}
                className="ml-2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-muted transition-colors"
                data-testid="button-toggle-dark"
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
