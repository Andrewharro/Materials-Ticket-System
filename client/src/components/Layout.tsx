import { useState } from "react";
import Sidebar from "./Sidebar";
import { getStoredUser } from "@/lib/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = getStoredUser();
  const isSubcontractor = user?.role === "SUBCONTRACTOR";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <main className="flex-1 overflow-y-auto">
        {isSubcontractor && user?.subcontractorName && (
          <div className="bg-blue-600 text-white text-center py-2 px-4 font-bold text-lg tracking-wide uppercase" data-testid="text-subcontractor-banner">
            {user.subcontractorName}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
