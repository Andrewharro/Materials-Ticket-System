import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { getStoredUser, apiGet } from "@/lib/auth";
import { User } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = getStoredUser();
  const isSubcontractor = user?.role === "SUBCONTRACTOR";
  const [companyName, setCompanyName] = useState<string | null>(user?.subcontractorName || null);

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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <main className="flex-1 overflow-y-auto">
        {isSubcontractor && companyName ? (
          <div className="bg-blue-600 text-white text-center py-2 px-4 font-bold text-lg tracking-wide uppercase" data-testid="text-subcontractor-banner">
            {companyName}
          </div>
        ) : user && !isSubcontractor && (
          <div className="flex items-center justify-end px-6 py-2 border-b border-slate-200 bg-white" data-testid="text-user-topbar">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800" data-testid="text-user-name">{user.firstName} {user.lastName}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{user.role}</span>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
