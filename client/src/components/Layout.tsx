import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { getStoredUser, apiGet } from "@/lib/auth";

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
        {isSubcontractor && companyName && (
          <div className="bg-blue-600 text-white text-center py-2 px-4 font-bold text-lg tracking-wide uppercase" data-testid="text-subcontractor-banner">
            {companyName}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
